import { eq } from 'drizzle-orm'
import type { DB } from '@/db/client'
import { subscription, processedWebhookEvents } from './billing.schema'
import { resolveEntitlement, isActivePro, type DomainEvent, type Entitlement, type BillingTransition } from './entitlement'
import { scopeFromUser, ownedBy } from '@/db/scope'
import type { PaymentProvider } from './payment'

/** 读用户 entitlement（经归属缝）。 */
export async function getEntitlementFor(db: DB, userId: string): Promise<Entitlement> {
  const rows = await db.select().from(subscription).where(ownedBy(subscription, scopeFromUser(userId)))
  const row = rows[0]
  return resolveEntitlement(row ? { status: row.status, plan: row.plan, currentPeriodEnd: row.currentPeriodEnd, lifetime: row.lifetime, paymentFailedAt: row.paymentFailedAt } : null)
}

/** 应用领域事件到订阅表（系统级，按 customerId 定位）。返回发生的状态跃迁（供回调），无跃迁则 null。
 *  cancelSubscription：买断时用于终止在生效中的 Stripe 订阅（须幂等）。先取消后授予——
 *  取消失败即抛错，让 webhook 返回 500 触发 Stripe 重投，避免订阅在买断后继续扣费。 */
export async function applyDomainEvent(
  db: DB,
  event: DomainEvent,
  now: number,
  cancelSubscription?: (subscriptionId: string) => Promise<void>,
): Promise<BillingTransition | null> {
  if (event.type === 'ignored') return null
  const rows = await db.select().from(subscription).where(eq(subscription.customerId, event.customerId))
  const row = rows[0]
  if (!row) return null // 无映射的 customer → 忽略

  const occurredAt = 'occurredAt' in event ? event.occurredAt : undefined
  const wasPro = isActivePro(row)

  // 跨订阅对象防护（在乱序守卫之前——它不改行状态，陈旧时间戳不该让并发订阅逃过取消）：
  // Checkout Session 有效期 24h 且完成时无二次守卫，双标签页并发、或「先买断/新订阅、再补付
  // 旧 session」都会在 Stripe 侧产生第二个活订阅。行上已有授权（终身买断或另一个活订阅）时，
  // 来件的陌生订阅一律幂等取消——否则它不入库、无人追踪、永久扣费。
  if (event.type === 'subscription.upserted'
      && (row.lifetime || (row.subscriptionId != null && row.subscriptionId !== event.subscriptionId && wasPro))) {
    const alreadyDead = event.status === 'canceled' || event.status === 'incomplete_expired'
    if (!alreadyDead && cancelSubscription) await cancelSubscription(event.subscriptionId)
    return null
  }
  // 上面取消并发订阅后 Stripe 会回发它的 deleted——不是行上跟踪的订阅，忽略，
  // 别把真订阅的行状态砸成 canceled。
  if (event.type === 'subscription.deleted' && row.subscriptionId != null && row.subscriptionId !== event.subscriptionId) return null

  // 乱序守卫：比已应用事件更旧的订阅流事件直接丢弃（如 deleted 之后才重投到达的
  // updated-active，若照单全收会把已取消的订阅复活成永久免费 Pro）。
  if (occurredAt != null && row.lastEventAt != null && occurredAt < row.lastEventAt) return null

  if (event.type === 'purchase.completed') {
    if (row.subscriptionId && cancelSubscription) await cancelSubscription(row.subscriptionId)
    await db.update(subscription).set({
      lifetime: true, plan: 'pro', status: 'active', subscriptionId: null,
      lifetimePaymentIntentId: event.paymentIntentId ?? null,
      priceId: event.priceId, currentPeriodEnd: null, updatedAt: new Date(now),
      paymentFailedAt: null, // 买断替代了订阅，催缴横幅随之失效（否则日后退款回 free 时它会复活）
    }).where(eq(subscription.id, row.id))
    return wasPro ? null : { kind: 'activated', userId: row.userId, via: 'lifetime' }
  }
  if (event.type === 'purchase.refunded') {
    // 已知限制：若退款事件先于授予事件到达（completed 首投失败重试期间管理员退款），此处
    // 无行可撤、被静默跳过，迟到的授予随后照常生效——闭合它需要一张退款台账，模板不引入。
    if (!row.lifetime) return null // 订阅退款不在此处理
    // 只有退的是买断那笔付款才撤授权——同客户其他 charge（如历史月费）的退款与终身授权无关。
    // 任一侧 PI 缺失（老数据/老事件）时保守回退到按客户匹配。
    if (row.lifetimePaymentIntentId && event.paymentIntentId && event.paymentIntentId !== row.lifetimePaymentIntentId) return null
    await db.update(subscription).set({
      lifetime: false, plan: 'free', status: 'canceled', paymentFailedAt: null, updatedAt: new Date(now),
    }).where(eq(subscription.id, row.id))
    return { kind: 'deactivated', userId: row.userId, reason: 'refunded' }
  }

  if (row.lifetime) return null // 终身授权不被订阅事件/扣款失败降级或改写

  if (event.type === 'payment.failed') {
    // 续费扣款失败：置 flag 供 app 内 banner 提示；重试邮件交给 Stripe。flag 清除于恢复扣款（见 subscription.upserted）。
    // 注意：不推进 lastEventAt——invoice 流与订阅流是两条独立事件流、几乎同时发出，若用扣款失败的
    // 时间戳污染订阅流时钟，会把同一秒稍早的 updated(past_due) 永久丢弃（用户整个催缴期保持 Pro）。
    // 本事件仍受时钟守卫（陈旧的失败不该盖掉更新的恢复），只是不写它。
    await db.update(subscription).set({ paymentFailedAt: now, updatedAt: new Date(now) }).where(eq(subscription.id, row.id))
    return { kind: 'payment_failed', userId: row.userId }
  }

  if (event.type === 'subscription.upserted') {
    const plan = event.priceId ? 'pro' : row.plan // 单一 Pro 产品：有 price 即 pro。多产品时按 priceId→plan 映射（扩展点）
    const recovered = event.status === 'active' || event.status === 'trialing' // 扣款恢复 → 清除失败 flag
    await db.update(subscription).set({
      subscriptionId: event.subscriptionId, status: event.status, plan,
      priceId: event.priceId, currentPeriodEnd: event.currentPeriodEnd,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd, updatedAt: new Date(now),
      paymentFailedAt: recovered ? null : row.paymentFailedAt,
      lastEventAt: occurredAt ?? row.lastEventAt,
    }).where(eq(subscription.id, row.id))
    const nowPro = isActivePro({ status: event.status, plan, lifetime: false })
    if (!wasPro && nowPro) return { kind: 'activated', userId: row.userId, via: 'subscription' }
    if (wasPro && !nowPro) return { kind: 'deactivated', userId: row.userId, reason: 'past_due' }
    return null
  }
  if (event.type === 'subscription.deleted') {
    await db.update(subscription).set({
      status: 'canceled', plan: 'free', subscriptionId: null, updatedAt: new Date(now),
      lastEventAt: occurredAt ?? row.lastEventAt,
      paymentFailedAt: null, // 订阅已死，「更新支付方式」横幅不该跟着免费用户一辈子
    }).where(eq(subscription.id, row.id))
    return wasPro ? { kind: 'deactivated', userId: row.userId, reason: 'canceled' } : null
  }
  return null
}

/** 开始 Stripe Checkout：确保 customer 存在 + upsert subscription 行 + 创建 session。 */
export async function startCheckout(
  db: DB,
  provider: PaymentProvider,
  user: { id: string; email: string },
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  now: number,
  mode: 'subscription' | 'payment' = 'subscription',
): Promise<{ url: string }> {
  const rows = await db.select().from(subscription).where(ownedBy(subscription, scopeFromUser(user.id)))
  const existing = rows[0]
  // 已是活跃 Pro/终身买断 → 拒绝：再开一单会产生第二个并发订阅（双扣费），
  // 换套餐/续费的正途是 Customer Portal。
  if (existing && isActivePro(existing)) {
    throw new Error('already subscribed — manage the plan via the customer portal instead')
  }
  const customerId = await provider.ensureCustomer(user, existing?.customerId ?? null)
  if (!existing) {
    await db.insert(subscription).values({
      id: crypto.randomUUID(),
      userId: user.id,
      provider: 'stripe',
      customerId,
      status: 'none',
      plan: 'free',
      cancelAtPeriodEnd: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    })
  } else if (existing.customerId !== customerId) {
    await db.update(subscription).set({ customerId, updatedAt: new Date(now) }).where(eq(subscription.id, existing.id))
  }
  return provider.createCheckoutSession({ customerId, priceId, userId: user.id, successUrl, cancelUrl, mode })
}

/** 删号前清理：取消该用户在生效中的 Stripe 订阅。行会随删号级联消失、customerId 映射
 *  一去不返，届时 Stripe 侧的活订阅将永远无法对账或停止——所以必须在删除前终止。
 *  抛错让删除中止：宁可删不掉，也不能留下无人认领的僵尸扣费。 */
export async function cancelSubscriptionsForUser(
  db: DB,
  cancelSubscription: (subscriptionId: string) => Promise<void>,
  userId: string,
): Promise<void> {
  const rows = await db.select().from(subscription).where(ownedBy(subscription, scopeFromUser(userId)))
  const row = rows[0]
  if (row?.subscriptionId) await cancelSubscription(row.subscriptionId)
}

/** 打开 Stripe Customer Portal。 */
export async function openPortal(
  db: DB,
  provider: PaymentProvider,
  userId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  const rows = await db.select().from(subscription).where(ownedBy(subscription, scopeFromUser(userId)))
  const row = rows[0]
  if (!row) throw new Error('No subscription/customer for user')
  return provider.createPortalSession(row.customerId, returnUrl)
}

/** pending 认领超过此时长视为死亡执行，允许重试接管（Worker 单请求远短于 60s）。 */
const STALE_CLAIM_MS = 60_000

/** webhook 编排：验签→幂等认领→落库→标记落定→（成功后）best-effort 触发跃迁回调。返回 HTTP 状态码。 */
export async function handleWebhook(
  db: DB,
  parse: (raw: string, sig: string) => Promise<DomainEvent>,
  rawBody: string,
  signature: string,
  now: number,
  apply: (db: DB, event: DomainEvent, now: number) => Promise<BillingTransition | null | void> = applyDomainEvent,
  onTransition: (db: DB, t: BillingTransition) => Promise<void> = async () => {},
): Promise<number> {
  let event: DomainEvent
  try {
    event = await parse(rawBody, signature)
  } catch {
    return 400 // 验签失败
  }
  // ignored 事件无副作用可保护，不占幂等表（否则账户上每个无关事件都永久留痕）。
  if (event.type === 'ignored') return 200
  // 两段式认领：先插 pending 标记占坑，apply 成功后翻 done。D1 无跨语句事务，
  // 若在两步之间被杀，标记会永远停在 pending——靠「陈旧 pending 可被重试接管」闭合窗口，
  // 否则 Stripe 重投撞唯一约束直接 200，事件被应答却从未应用。
  try {
    await db.insert(processedWebhookEvents).values({ eventId: event.eventId, processedAt: new Date(now), status: 'pending' })
  } catch {
    const markers = await db.select().from(processedWebhookEvents).where(eq(processedWebhookEvents.eventId, event.eventId))
    const marker = markers[0]
    if (!marker) return 500 // 插入失败却查无标记：瞬时故障 → 让 Stripe 重试
    if (marker.status === 'done') return 200 // 重复投递 → 幂等跳过
    // in-flight 双胞胎：应答 500 让 Stripe 稍后重投——认领者若成功，重投会看到 done→200；
    // 若认领者被杀（isolate 驱逐/CPU 超限，无任何应答），标记变陈旧后由重投接管。
    // 此处若应答 200，认领者死亡 + 重投恰落在 60s 窗口内时，事件会被应答却永远没被应用。
    if (now - marker.processedAt.getTime() < STALE_CLAIM_MS) return 500
    // 陈旧 pending = 上次执行死在认领与落库之间 → 接管重跑
    await db.update(processedWebhookEvents).set({ processedAt: new Date(now) }).where(eq(processedWebhookEvents.eventId, event.eventId))
  }
  let transition: BillingTransition | null | void
  try {
    transition = await apply(db, event, now)
  } catch {
    // compensate: remove the marker so Stripe's retry re-applies
    try { await db.delete(processedWebhookEvents).where(eq(processedWebhookEvents.eventId, event.eventId)) } catch { /* best effort */ }
    return 500
  }
  // apply 成功 → 落定标记。此步失败也返回 200：apply 是幂等的，标记留在 pending，
  // 下一次同 eventId 投递（若有）会在变陈旧后无害地重跑。
  try {
    await db.update(processedWebhookEvents).set({ status: 'done' }).where(eq(processedWebhookEvents.eventId, event.eventId))
  } catch (e) { console.error('[billing] failed to finalize webhook marker', e) }
  if (transition) {
    // 副作用 best-effort：回调失败不影响 webhook 返回 200（否则会触发 Stripe 重投 → 重复副作用）
    try { await onTransition(db, transition) } catch (e) { console.error('[billing-hooks] onTransition failed', e) }
  }
  return 200
}
