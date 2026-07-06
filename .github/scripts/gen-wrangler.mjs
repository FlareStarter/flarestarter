/**
 * CI helper: generate `wrangler.jsonc` (git-ignored) from the committed
 * `wrangler.example.jsonc` template by injecting the real production resource
 * ids. Run in the Deploy workflow before `pnpm build`.
 *
 * Values come from repo Variables (Settings → Secrets and variables → Actions →
 * Variables) — these are identifiers, not secrets:
 *   - CF_PROD_D1_ID   (required)  production D1 database_id
 *   - CF_PROD_KV_ID   (required)  production KV namespace id
 *   - CF_PROD_DOMAIN  (optional)  custom domain, e.g. flarestarter.com
 *
 * Only the production env block is patched (this workflow deploys production).
 */
import { readFileSync, writeFileSync } from 'node:fs'

const { CF_PROD_D1_ID, CF_PROD_KV_ID, CF_PROD_DOMAIN } = process.env

if (!CF_PROD_D1_ID || !CF_PROD_KV_ID) {
  console.error('::error::Set repo Variables CF_PROD_D1_ID and CF_PROD_KV_ID to enable deploy')
  process.exit(1)
}

const text = readFileSync('wrangler.example.jsonc', 'utf8')

// Split at the production env block so replacements never touch staging placeholders.
const at = text.indexOf('"production"')
if (at === -1) {
  console.error('::error::wrangler.example.jsonc has no "production" env block')
  process.exit(1)
}
const head = text.slice(0, at)
let prod = text.slice(at)

// First occurrence within the production slice is production's own placeholder.
prod = prod
  .replace('00000000-0000-0000-0000-000000000000', CF_PROD_D1_ID)
  .replace('00000000000000000000000000000000', CF_PROD_KV_ID)

if (CF_PROD_DOMAIN) {
  prod = prod.replace(
    '"name": "flarestarter-production",',
    `"name": "flarestarter-production",\n\t\t\t"routes": [{ "pattern": "${CF_PROD_DOMAIN}", "custom_domain": true }],`,
  )
}

writeFileSync('wrangler.jsonc', head + prod)
console.log(`Generated wrangler.jsonc for production${CF_PROD_DOMAIN ? ` (domain: ${CF_PROD_DOMAIN})` : ''}`)
