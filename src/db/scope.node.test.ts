import { test, expect } from 'vitest'
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core'
import { feedback } from '@/features/feedback/feedback.schema'
import { scopeFromUser, ownedBy, withOwner } from '@/db/scope'

test('scopeFromUser 构造归属上下文', () => {
  expect(scopeFromUser('user-1')).toEqual({ ownerId: 'user-1' })
})

test('ownedBy 生成按归属列过滤的条件', () => {
  const scope = scopeFromUser('user-1')
  const dialect = new SQLiteSyncDialect()
  const query = dialect.sqlToQuery(ownedBy(feedback, scope))
  expect(query.sql).toBe('"feedback"."user_id" = ?')
  expect(query.params).toEqual(['user-1'])
})

test('withOwner 向插入值注入归属列', () => {
  const scope = scopeFromUser('user-1')
  const values = withOwner(scope, { id: 'n1', title: 'hi', body: '', createdAt: new Date(0), updatedAt: new Date(0) })
  expect(values.userId).toBe('user-1')
  expect(values.title).toBe('hi')
})

test('withOwner overwrites any pre-existing userId in values', () => {
  const scope = scopeFromUser('user-correct')
  const values = withOwner(scope, { id: 'n1', userId: 'user-injected', title: 'hi' })
  expect(values.userId).toBe('user-correct')
})
