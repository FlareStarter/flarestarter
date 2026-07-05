import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

/**
 * 每个请求调用一次，返回新的 Drizzle 实例（CF 坑 #1：绝不跨请求复用）。
 * 用法：const db = createDb(env.DB)
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type DB = ReturnType<typeof createDb>
