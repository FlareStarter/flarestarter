# AGENTS.md

Guide for AI coding agents (Claude Code, Codex, etc.) working in this repo.

## What this is

FlareStarter — a Cloudflare-native SaaS starter on **TanStack Start + Cloudflare Workers**, with D1 (SQLite) + KV, Drizzle ORM, better-auth, Stripe, Resend, and Tailwind v4. Clone it and build your product on top.

## Structure

- `src/features/*` — vertical feature slices, each self-contained (schema / server fns / actions / components): `admin`, `analytics`, `audience`, `auth`, `billing`, `changelog`, `docs`, `email`, `i18n`, `maintenance`, `notifications`, `seo`, `storage`, `theme`, `waitlist`.
- `src/routes/{-$locale}/` — file-based routes with an optional locale prefix (`/` = en, `/zh` = zh). Top-level routes (`api`, `sitemap`, `robots`, `docs`) live outside the locale group.
- `src/components/` — `ui/` primitives + `marketing/` landing + `app/` shell.
- `src/db/` — Drizzle client + `schema.ts` barrel; tables in `src/db/tables/` and feature `*.schema.ts`.
- `src/content/docs/` — in-app docs, grouped into `getting-started/`, `features/`, `platform/`, `customization/` (read `platform/cf-gotchas.mdx` before touching Workers/D1 specifics).

## Conventions

- **Env:** read from `@/lib/env` (re-exports `cloudflare:workers`). Never use `process.env`. In server-only modules read env **lazily** inside the function (`const { env } = await import('@/lib/env')`) so pure cores stay node-testable.
- **i18n:** `src/features/i18n/dictionaries/en.ts` + `zh.ts` must be structurally identical (`zh` is typed `Dict = typeof en`). Add every key to both.
- **DB:** Drizzle + D1 migrations — `pnpm db:generate` then `pnpm db:migrate:local`; register new tables in `src/db/schema.ts`.
- **No mock, graceful degradation:** optional integrations (Resend, Stripe, Turnstile, Sentry, analytics) switch off when their env keys are absent — keep that behavior.
- **Routes:** after adding a route, run `pnpm build` before `pnpm typecheck` (the route tree is generated at build).
- **Tests:** Vitest — node pool (`*.node.test.ts`) for pure logic, workers pool (`*.workers.test.ts`) for D1; the workers pool does NOT auto-apply migrations (hand-create tables in `beforeAll`).

## Commands

```bash
pnpm dev               # vite dev on :3000
pnpm typecheck         # fumadocs-mdx && tsc --noEmit
pnpm test                  # vitest run
pnpm build             # vite build
pnpm db:migrate:local  # apply D1 migrations locally
pnpm deploy:prod       # CLOUDFLARE_ENV=production build + wrangler deploy (staging: deploy:staging)
```
