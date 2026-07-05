import { test, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import { createDb } from '@/db/client'
import { feedback } from '@/features/feedback/feedback.schema'
import { scopeFromUser, ownedBy, withOwner } from '@/db/scope'

beforeAll(async () => {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open', admin_note TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  ).run()
})

test('B 读不到 A 的数据（归属缝隔离）', async () => {
  const db = createDb(env.DB)
  const a = scopeFromUser('user-a')
  const b = scopeFromUser('user-b')

  await db.insert(feedback).values(
    withOwner(a, {
      id: 'a-feedback-1',
      title: 'A only',
      body: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  )

  const seenByA = await db.select().from(feedback).where(ownedBy(feedback, a))
  const seenByB = await db.select().from(feedback).where(ownedBy(feedback, b))

  expect(seenByA.map((n) => n.id)).toContain('a-feedback-1')
  expect(seenByB).toHaveLength(0)
})
