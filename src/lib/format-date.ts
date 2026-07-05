/**
 * Deterministic date formatting for SSR'd tables. `toLocaleDateString()` and
 * `Intl.DateTimeFormat` differ between the server (workerd runs in UTC) and
 * the browser (local timezone/locale), which breaks React hydration. These
 * helpers render the same string on both sides: UTC, locale-neutral.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** `2026-07-04` (UTC). Empty/nullish → em dash. */
export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** `2026-07-04 03:16 UTC`. Empty/nullish → em dash. */
export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return `${fmtDate(date)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}
