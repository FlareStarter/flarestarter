import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const sponsorship = sqliteTable('sponsorship', {
  id: text('id').primaryKey(),                                 // = Stripe checkout session id
  email: text('email'),                                        // Stripe 收集，可能为空
  github: text('github'),                                      // 选填 GitHub 用户名（致谢名单来源）
  message: text('message'),                                    // 选填公开留言（≤80，展示在赞助墙）
  amount: integer('amount').notNull(),                         // 最小货币单位 (cents)
  currency: text('currency').notNull().default('usd'),
  mode: text('mode').notNull(),                                // 'once' | 'recurring'
  stripeSessionId: text('stripe_session_id').notNull().unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),        // 仅 recurring
  stripePaymentIntentId: text('stripe_payment_intent_id'),     // 仅 once；退款/拒付事件按此匹配
  status: text('status').notNull(),                            // 'completed' | 'active' | 'canceled' | 'refunded' | 'disputed'
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false), // 管理员下架位
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
}, (t) => [
  // refund/dispute 事件对账户上每笔 charge 都会触发（无 metadata 可过滤），
  // 逐笔按 PI/订阅 id 匹配——没有索引就是全表扫
  index('sponsorship_subscription_id_idx').on(t.stripeSubscriptionId),
  index('sponsorship_payment_intent_id_idx').on(t.stripePaymentIntentId),
])

export type Sponsorship = typeof sponsorship.$inferSelect
