import { sponsorConfig } from './sponsor.config'

/** Validate a sponsorship amount (minor units) against config bounds. Throws on invalid. */
export function validateAmount(cents: unknown): number {
  if (typeof cents !== 'number' || !Number.isInteger(cents)) throw new Error('Amount must be integer cents')
  if (cents < sponsorConfig.minCents || cents > sponsorConfig.maxCents) throw new Error('Amount out of range')
  return cents
}

/** Optional public message: trim, strip control chars, cap at config length. Null when empty. */
export function validateMessage(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const cleaned = input.replace(/[\u0000-\u001F\u007F]/g, '').trim()  // eslint-disable-line no-control-regex
  if (!cleaned) return null
  return cleaned.slice(0, sponsorConfig.messageMaxLen)
}

// GitHub: 1–39 chars, alphanumerics or single hyphens, no leading/trailing/consecutive hyphen.
const GITHUB_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/

/** Normalize + validate an optional GitHub username. Returns null when empty or invalid. */
export function validateGithub(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const handle = input.trim().replace(/^@/, '')
  if (!handle) return null
  return GITHUB_RE.test(handle) ? handle : null
}
