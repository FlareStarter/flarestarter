// 中央 schema barrel：迁移与（商业版）迁移工具包面对的唯一 schema 视图。
// 各 feature 的表片段在此 re-export。
export * from '@/features/auth/auth.schema'
export * from '@/features/billing/billing.schema'
export * from './tables/waitlist'
export * from '@/features/sponsor/sponsor.schema'
export * from '@/features/feedback/feedback.schema'
