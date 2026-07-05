import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const waitlist = sqliteTable('waitlist', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  locale: text('locale').notNull(),
  source: text('source').notNull().default('waitlist'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export type Waitlist = typeof waitlist.$inferSelect
