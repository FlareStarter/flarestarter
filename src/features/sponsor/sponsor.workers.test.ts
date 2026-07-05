import { describe, test, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { createDb } from '@/db/client'
import { sponsorship } from './sponsor.schema'
import { recordSponsorship, listPublicSponsors, applySponsorEvent, listSponsorships, setSponsorshipHidden } from './sponsor.server'
import type { SponsorRecord } from './webhook'

beforeAll(async () => {
  await env.DB.exec(
    `CREATE TABLE IF NOT EXISTS sponsorship (` +
    `id TEXT PRIMARY KEY NOT NULL, email TEXT, github TEXT, message TEXT, amount INTEGER NOT NULL, ` +
    `currency TEXT NOT NULL DEFAULT 'usd', mode TEXT NOT NULL, ` +
    `stripe_session_id TEXT NOT NULL UNIQUE, stripe_subscription_id TEXT, stripe_payment_intent_id TEXT, ` +
    `status TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  )
})

const rec: SponsorRecord = {
  id: 'cs_a', email: 'a@example.com', amount: 2500, currency: 'usd',
  mode: 'once', stripeSessionId: 'cs_a', stripeSubscriptionId: null, stripePaymentIntentId: null, status: 'completed',
  github: null, message: null,
}

describe('recordSponsorship', () => {
  test('inserts a sponsorship row', async () => {
    const db = createDb(env.DB)
    await recordSponsorship(db, rec, 1_700_000_000_000)
    const rows = await db.select().from(sponsorship).where(eq(sponsorship.id, 'cs_a'))
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(2500)
  })

  test('is idempotent on duplicate session id', async () => {
    const db = createDb(env.DB)
    await recordSponsorship(db, rec, 1_700_000_000_000)
    await recordSponsorship(db, rec, 1_700_000_000_000)
    const rows = await db.select().from(sponsorship).where(eq(sponsorship.stripeSessionId, 'cs_a'))
    expect(rows).toHaveLength(1)
  })
})

test('listPublicSponsors returns distinct github handles, newest first', async () => {
  const db = createDb(env.DB)
  await recordSponsorship(db, { ...rec, id: 'cs_g1', stripeSessionId: 'cs_g1', github: 'alice' }, 1000)
  await recordSponsorship(db, { ...rec, id: 'cs_g2', stripeSessionId: 'cs_g2', github: 'bob' }, 2000)
  await recordSponsorship(db, { ...rec, id: 'cs_g3', stripeSessionId: 'cs_g3', github: null }, 3000)
  const rows = await listPublicSponsors(db)
  const githubs = rows.map((r) => r.github)
  expect(githubs[0]).toBe('bob')          // newest first
  expect(githubs).toContain('alice')
  expect(githubs).not.toContain(null)
})

test('listPublicSponsors dedup: two rows for same github → cumulative amount summed', async () => {
  await env.DB.exec('DELETE FROM sponsorship')
  const db = createDb(env.DB)
  // two valid rows for the same handle must collapse into one entry with the SUM of amounts
  await recordSponsorship(db, { ...rec, id: 'cs_d1', stripeSessionId: 'cs_d1', github: 'carol', amount: 5000 }, 1000)
  await recordSponsorship(db, { ...rec, id: 'cs_d2', stripeSessionId: 'cs_d2', github: 'carol', amount: 1000 }, 2000)
  const rows = await listPublicSponsors(db)
  expect(rows.filter((r) => r.github === 'carol')).toHaveLength(1)
  expect(rows.find((r) => r.github === 'carol')?.amount).toBe(6000) // cumulative sum, not newest-only
})

test('listPublicSponsors returns rich rows, sorted by cumulative amount desc, github-only, distinct', async () => {
  await env.DB.exec('DELETE FROM sponsorship')
  const db = createDb(env.DB)
  await recordSponsorship(db, { ...rec, id: 'cs_p1', stripeSessionId: 'cs_p1', github: 'ada', amount: 10000, message: 'hi', mode: 'recurring', status: 'active' }, 1000)
  await recordSponsorship(db, { ...rec, id: 'cs_p2', stripeSessionId: 'cs_p2', github: 'bo', amount: 500, message: null, mode: 'once' }, 2000)
  await recordSponsorship(db, { ...rec, id: 'cs_p3', stripeSessionId: 'cs_p3', github: null, amount: 5000, message: null, mode: 'once' }, 3000)
  const rows = await listPublicSponsors(db)
  expect(rows.map((r) => r.github)).toEqual(['ada', 'bo']) // sorted by amount desc, not createdAt
  expect(rows[0]).toMatchObject({ github: 'ada', amount: 10000, message: 'hi', mode: 'recurring' })
})

describe('applySponsorEvent', () => {
  test('canceled：按 subscription id 置 canceled', async () => {
    const db = createDb(env.DB)
    await applySponsorEvent(db, { type: 'created', record: { ...rec, id: 'cs_sub1', stripeSessionId: 'cs_sub1', mode: 'recurring', status: 'active', stripeSubscriptionId: 'sub_c1' } }, 1000)
    await applySponsorEvent(db, { type: 'canceled', subscriptionId: 'sub_c1' }, 2000)
    const [row] = await db.select().from(sponsorship).where(eq(sponsorship.id, 'cs_sub1'))
    expect(row.status).toBe('canceled')
  })
  test('refunded：按 payment intent 置 refunded；不匹配时为 no-op', async () => {
    const db = createDb(env.DB)
    await applySponsorEvent(db, { type: 'created', record: { ...rec, id: 'cs_pi1', stripeSessionId: 'cs_pi1', stripePaymentIntentId: 'pi_r1' } }, 1000)
    await applySponsorEvent(db, { type: 'refunded', paymentIntentId: 'pi_other' }, 2000) // no-op
    await applySponsorEvent(db, { type: 'refunded', paymentIntentId: 'pi_r1' }, 3000)
    const [row] = await db.select().from(sponsorship).where(eq(sponsorship.id, 'cs_pi1'))
    expect(row.status).toBe('refunded')
  })
  test('disputed：按 payment intent 置 disputed', async () => {
    const db = createDb(env.DB)
    await applySponsorEvent(db, { type: 'created', record: { ...rec, id: 'cs_pi2', stripeSessionId: 'cs_pi2', stripePaymentIntentId: 'pi_d1' } }, 1000)
    await applySponsorEvent(db, { type: 'disputed', paymentIntentId: 'pi_d1' }, 2000)
    const [row] = await db.select().from(sponsorship).where(eq(sponsorship.id, 'cs_pi2'))
    expect(row.status).toBe('disputed')
  })
  test('canceled：续费多期后取消，只终结 active 锚点行，已付累计留在墙上', async () => {
    const db = createDb(env.DB)
    const base = { ...rec, github: 'kai', mode: 'recurring' as const, stripeSubscriptionId: 'sub_hist', amount: 500 }
    await applySponsorEvent(db, { type: 'created', record: { ...base, id: 'cs_h0', stripeSessionId: 'cs_h0', status: 'active' } }, 1000)
    await applySponsorEvent(db, { type: 'renewed', record: { ...base, id: 'in_h1', stripeSessionId: 'in_h1', status: 'completed' } }, 2000)
    await applySponsorEvent(db, { type: 'renewed', record: { ...base, id: 'in_h2', stripeSessionId: 'in_h2', status: 'completed' } }, 3000)
    await applySponsorEvent(db, { type: 'canceled', subscriptionId: 'sub_hist' }, 4000)

    const rows = await db.select().from(sponsorship).where(eq(sponsorship.stripeSubscriptionId, 'sub_hist'))
    expect(rows.find((r) => r.id === 'cs_h0')!.status).toBe('canceled')   // 订阅锚点行终结
    expect(rows.filter((r) => r.status === 'completed')).toHaveLength(2)  // 已付续费行不动

    const wall = await listPublicSponsors(db)
    const kai = wall.find((s) => s.github === 'kai')!
    expect(kai.amount).toBe(1500) // 钱都付了且未退：三期全部计入累计（含锚点期）
    expect(kai.mode).toBe('once') // 但 /mo 徽章随取消消失
  })

  test('renewed：续费行继承管理员的 hidden 决定（下架不被下月续费自动撤销）', async () => {
    const db = createDb(env.DB)
    const base = { ...rec, github: 'mallory', mode: 'recurring' as const, stripeSubscriptionId: 'sub_mod', message: 'rude msg' }
    await applySponsorEvent(db, { type: 'created', record: { ...base, id: 'cs_m0', stripeSessionId: 'cs_m0', status: 'active' } }, 1000)
    await setSponsorshipHidden(db, 'cs_m0', true) // 管理员下架
    await applySponsorEvent(db, { type: 'renewed', record: { ...base, id: 'in_m1', stripeSessionId: 'in_m1', status: 'completed' } }, 2000)
    const [renewal] = await db.select().from(sponsorship).where(eq(sponsorship.id, 'in_m1'))
    expect(renewal.hidden).toBe(true) // 继承最近一行的 hidden
    const wall = await listPublicSponsors(db)
    expect(wall.find((s) => s.github === 'mallory')).toBeUndefined() // 不回墙
  })

  test('renewed：invoice 记录幂等（同 id 重复投递不重复入账）', async () => {
    const db = createDb(env.DB)
    const renewed = { type: 'renewed' as const, record: { ...rec, id: 'in_r1', stripeSessionId: 'in_r1', mode: 'recurring' as const, stripeSubscriptionId: 'sub_c1' } }
    await applySponsorEvent(db, renewed, 1000)
    await applySponsorEvent(db, renewed, 2000)
    const rows = await db.select().from(sponsorship).where(eq(sponsorship.id, 'in_r1'))
    expect(rows).toHaveLength(1)
  })
})

describe('listPublicSponsors（累计聚合）', () => {
  test('同一 github 累计金额、排除 canceled/refunded/hidden、/mo 看 active、按累计降序', async () => {
    await env.DB.exec('DELETE FROM sponsorship') // isolate from earlier tests' leftover rows (exact-array assertion below)
    const db = createDb(env.DB)
    const mk = (id: string, over: Partial<SponsorRecord>) =>
      applySponsorEvent(db, { type: 'created', record: { ...rec, id, stripeSessionId: id, ...over } }, 1000)
    await mk('w1', { github: 'alice', amount: 1500 })
    await mk('w2', { github: 'alice', amount: 2000, message: 'newest note' })
    await mk('w3', { github: 'bob', amount: 10000, mode: 'recurring', status: 'active', stripeSubscriptionId: 'sub_b' })
    await mk('w4', { github: 'carol', amount: 99999 })
    await db.update(sponsorship).set({ status: 'refunded' }).where(eq(sponsorship.id, 'w4')) // 退款 → 不计
    await mk('w5', { github: 'dave', amount: 88888 })
    await db.update(sponsorship).set({ hidden: true }).where(eq(sponsorship.id, 'w5'))      // 下架 → 不出现
    const out = await listPublicSponsors(db)
    const alice = out.find((s) => s.github === 'alice')!
    expect(alice.amount).toBe(3500)              // 1500 + 2000 累计
    expect(alice.message).toBe('newest note')    // 取最新一笔非空留言
    expect(out.find((s) => s.github === 'bob')!.mode).toBe('recurring') // active 订阅 → /mo
    expect(alice.mode).toBe('once')
    expect(out.map((s) => s.github)).toEqual(['bob', 'alice'])          // 累计降序；carol/dave 被排除
  })
})

describe('admin sponsorships', () => {
  test('listSponsorships 新→旧分页含 hidden 行;setSponsorshipHidden 切换', async () => {
    const db = createDb(env.DB)
    await applySponsorEvent(db, { type: 'created', record: { ...rec, id: 'adm1', stripeSessionId: 'adm1', github: 'zoe' } }, 5000)
    const { rows, total } = await listSponsorships(db, { page: 0, pageSize: 100 })
    expect(total).toBeGreaterThanOrEqual(1)
    expect(rows[0].id).toBe('adm1') // createdAt 最大 → 排最前
    await setSponsorshipHidden(db, 'adm1', true)
    const after = await listSponsorships(db, { page: 0, pageSize: 100 })
    expect(after.rows.find((r) => r.id === 'adm1')!.hidden).toBe(true)
  })
})
