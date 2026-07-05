import { eq, type SQL } from 'drizzle-orm'
import type { Column } from 'drizzle-orm'

/** 归属上下文。开源版 ownerId === userId；商业版替换为 tenantId。 */
export interface Scope {
  ownerId: string
}

export function scopeFromUser(userId: string): Scope {
  return { ownerId: userId }
}

/**
 * 唯一允许的归属过滤入口。所有业务查询必须用它，禁止手写 where userId = ...。
 * 商业版只改这一个函数即可切到 tenantId。
 */
export function ownedBy(table: { userId: Column }, scope: Scope): SQL {
  return eq(table.userId, scope.ownerId)
}

/** 向插入值注入归属列。 */
export function withOwner<V extends Record<string, unknown>>(
  scope: Scope,
  values: V,
): V & { userId: string } {
  return { ...values, userId: scope.ownerId }
}
