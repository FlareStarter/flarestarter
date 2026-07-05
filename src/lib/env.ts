import { env } from 'cloudflare:workers'

/**
 * 唯一的 Cloudflare bindings 访问入口。
 * 本项目禁止使用 process.env —— 一律从这里取（见 docs/cf-gotchas.md）。
 */
export { env }
