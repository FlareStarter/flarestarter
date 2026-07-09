<div align="center">
  <h1>FlareStarter</h1>
  <p>A full-stack, edge-native SaaS starter built on <strong>TanStack Start</strong> + <strong>Cloudflare Workers</strong>.</p>
  <p>
    <a href="https://github.com/FlareStarter/flarestarter/actions/workflows/ci.yml"><img src="https://github.com/FlareStarter/flarestarter/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://github.com/FlareStarter/flarestarter/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
    <a href="https://developers.cloudflare.com/workers/"><img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript"></a>
  </p>
  <p>
    <i>Auth, billing, email, i18n, SEO, an admin console — wired, tested, fork-ready.</i>
  </p>
  <p>
    <a href="https://flarestarter.com"><strong>Live Demo</strong></a> ·
    <a href="https://flarestarter.com/docs"><strong>Docs</strong></a>
  </p>
  <a href="https://flarestarter.com"><img src=".github/assets/hero.png" alt="FlareStarter — clone it, ship on Cloudflare by tonight" width="100%"></a>
</div>

---

**English** | [简体中文](README.md)

FlareStarter ships only what actually works: every feature in this repo is a real implementation — no mocks, no stubs, no placeholder TODOs padding the count. It all runs on the Cloudflare free-to-cheap stack (Workers + D1 + KV).

## Core advantages

- **Edge-native compute**: Cloudflare Workers — millisecond responses worldwide, no cold starts.
- **Near-zero ops cost**: built around CF's free tiers; start at $0 and absorb traffic spikes effortlessly.
- **Batteries included**: no library archaeology — auth, billing, email and the other SaaS essentials work out of the box.
- **End-to-end type safety**: one TypeScript chain from the database (Drizzle) to the frontend (TanStack Start).

## Preview

Dark-first design with a terminal aesthetic. Every shot below is a real running screen — the admin console runs on real data, no fabricated metrics. Try it live on the [demo](https://flarestarter.com).

**Admin console · stats dashboard** (registrations / active / subscriptions, all real)

<p align="center">
  <img src=".github/assets/admin.png" alt="Admin stats dashboard" width="100%">
</p>

| User management (roles / ban / impersonate / paginated search) | App dashboard (plan-gated) |
|:---:|:---:|
| <img src=".github/assets/admin-users.png" alt="User management table" width="100%"> | <img src=".github/assets/app-dashboard.png" alt="App dashboard" width="100%"> |
| **Pricing: open-source core + lifetime Pro** | **Plan-gated Pro area (`requirePlan`)** |
| <a href="https://flarestarter.com/pricing"><img src=".github/assets/pricing.png" alt="Pricing page" width="100%"></a> | <img src=".github/assets/app-pro.png" alt="Pro-only content" width="100%"> |
| **Feedback (submit + team replies)** | **Standalone sponsor page (PWYW tiers)** |
| <img src=".github/assets/app-feedback.png" alt="Feedback user page" width="100%"> | <a href="https://flarestarter.com/sponsor"><img src=".github/assets/sponsor.png" alt="Sponsor page" width="100%"></a> |

## What's inside

| Area | What you get |
|------|--------------|
| **Auth** | Email/password with mandatory verification, password reset, and account deletion via [better-auth](https://better-auth.com). Google & GitHub OAuth that gracefully hide themselves when their env vars are unset. Sessions use D1 as source of truth with a cookie cache. |
| **Billing** | [Stripe](https://stripe.com) subscriptions (monthly/yearly) **and** one-time lifetime purchase, a Customer Portal link, plan-gated routes (`requirePlan`), idempotent webhook handling, and best-effort billing event hooks (e.g. "send an email when Pro activates"). Failed renewals surface an in-app "update your payment method" banner (retry emails are left to Stripe) — see [billing](https://flarestarter.com/docs/features/billing). |
| **Storage** | [R2](https://developers.cloudflare.com/r2/) object storage with a working avatar upload (validated, streamed back through a serving route since R2 isn't public). Zero-config locally via miniflare. The reference for any file-upload feature — see [storage](https://flarestarter.com/docs/features/storage). |
| **Email** | [Resend](https://resend.com) with string templates (React Email isn't usable on workerd). Missing API key? Emails are captured to the console so local dev never blocks. |
| **Waitlist** | A complete pre-launch signup loop: a public signup page, Turnstile bot protection, an admin management page + CSV export, and automatic subscriber sync into a [Resend](https://resend.com) audience (gracefully skipped when unconfigured). |
| **Changelog** | An in-app `/changelog` page — MDX-driven, per-locale, with a `published` flag — turning release notes into a real product page rather than just a `CHANGELOG.md` in the repo. |
| **Sponsor** | A standalone `/sponsor` page demoing a real Stripe donation loop: **pure donation — unlocks nothing** (entitlement untouched). Both one-time and monthly are **amount-driven** (PWYW/custom amount, inline `price_data.recurring` — no pre-created Price IDs needed). GitHub thank-you **avatar wall grouped by amount tier**, with optional public message. Monthly subscriptions are cancellable via the Stripe portal. Webhook dispatched by metadata + idempotent recording. Degrades to a "not configured" state without a Stripe key. Customize via `src/features/sponsor/sponsor.config.ts` (amounts/tiers/toggles/thresholds) + i18n `sponsor.*` copy — no component edits needed. |
| **Feedback** | Signed-in users submit feedback + a "my feedback" list (delete your own `open` items); an admin governance page drives status transitions (open/planned/shipped/closed) and one-line replies; admin-submitted items show a Pro badge (demoing `hasProAccess`). Also the **reference for adding your own feature**: a vertical slice exercising ownership filtering (`db/scope`), a pure function layer, both gate patterns, and dual-pool tests — see [feedback](https://flarestarter.com/docs/features/feedback). |
| **i18n** | Path-based locale routing via TanStack's `{-$locale}` optional prefix — English at `/`, 中文 at `/zh`. Marketing copy and UI strings both translated. |
| **SEO** | Per-locale sitemap, `hreflang`, canonical URLs, OpenGraph tags, `robots.txt`, and `noindex` on authenticated pages. |
| **AI-ready** | **Runtime:** built-in [`llms.txt`](https://flarestarter.com/llms.txt) index and [`llms-full.txt`](https://flarestarter.com/llms-full.txt) full corpus, clean frontmatter-stripped Markdown for any doc page via `/docs-md/*`, and a `robots.txt` pointing to both — so AI crawlers and answer engines (ChatGPT, Perplexity, …) can index and cite your content. **Codebase:** [`AGENTS.md`](AGENTS.md) (auto-imported into [`CLAUDE.md`](CLAUDE.md)) is a single source of truth that lets coding agents like Claude Code / Codex understand this repo and build on it right away. |
| **Admin** | better-auth admin plugin: roles, ban, user impersonation, a searchable/paginated user table, and a stats dashboard (registrations / active / subscriptions) — all built on real data, no fabricated metrics. |
| **Theme** | Dark-first design with a light/dark toggle persisted via cookie. |
| **Security & observability** | Turnstile bot protection, security headers + production CSP, auth-endpoint rate limiting (D1-backed), startup env validation (fail-fast); CF Web Analytics (cookieless) and Sentry error reporting — all optional, off when their keys are blank. See [security](https://flarestarter.com/docs/platform/security) / [observability](https://flarestarter.com/docs/platform/observability). |
| **Dev/Ops** | A Cron Triggers reference implementation (daily cleanup of expired sessions/tokens/rate-limit rows), local/staging/prod environment separation, and GitHub Actions CI (lint + typecheck + build). |

## Tech stack

- **[TanStack Start](https://tanstack.com/start)** (React 19, file-based routing, server functions)
- **[Cloudflare Workers](https://workers.cloudflare.com)** runtime, deployed via the `@cloudflare/vite-plugin`
- **[D1](https://developers.cloudflare.com/d1/)** (SQLite) with **[Drizzle ORM](https://orm.drizzle.team)** + migrations
- **[KV](https://developers.cloudflare.com/kv/)** for caching, **[R2](https://developers.cloudflare.com/r2/)** for object storage — wired end-to-end (validated upload + private serving route), with avatar upload as the reference
- **[better-auth](https://better-auth.com)**, **[Stripe](https://stripe.com)**, **[Resend](https://resend.com)**
- **[Tailwind CSS v4](https://tailwindcss.com)**
- **[Vitest](https://vitest.dev)** (Node unit tests + Workers/D1 integration tests via `@cloudflare/vitest-pool-workers`)

## Prerequisites

- **Node.js** >= 22 (recommended to use [nvm](https://github.com/nvm-sh/nvm) or [volta](https://volta.sh/))
- **pnpm** >= 9
- A **Cloudflare** account (free tier is enough to start)
- `wrangler` CLI (already installed as a dev dependency, no need to install globally)

## Quick start

```bash
# 1. Install
pnpm install

# 2. Create your local Wrangler config (holds D1/KV ids etc.; git-ignored,
#    the reference template is committed)
cp wrangler.example.jsonc wrangler.jsonc

# 3. Configure local env (copy the example and fill in what you need)
cp .dev.vars.example .dev.vars
#    Everything is optional locally — blank Stripe/Resend keys degrade
#    gracefully (no billing, console-captured emails).

# 4. Create the local D1 schema
pnpm db:migrate:local

# 5. Run it
pnpm dev          # http://localhost:3000
```

### Useful scripts

```bash
pnpm dev               # dev server on :3000
pnpm build             # production build
pnpm test              # full test suite (Vitest)
pnpm typecheck         # tsc --noEmit
pnpm lint              # eslint
pnpm db:generate       # generate a Drizzle migration from schema changes
pnpm db:migrate:local  # apply migrations to local D1
pnpm db:reset:local    # wipe + re-migrate + re-seed local D1
pnpm cf-typegen        # regenerate worker-configuration.d.ts from wrangler.jsonc
```

## Project structure

```
src/
  features/        # vertical slices, each self-contained
    auth/          # better-auth setup, middleware, social buttons
    billing/       # Stripe provider, entitlements, webhooks, hooks
    storage/       # R2 object storage: validated upload + serving route (avatar)
    email/         # Resend client + string templates
    waitlist/      # signup page + Turnstile + admin mgmt + CSV export + Resend audience sync
    audience/      # Resend contacts/audience sync (reused by waitlist)
    changelog/     # MDX-driven in-app changelog page (/changelog)
    sponsor/       # standalone sponsor page: one-time/monthly Stripe + GitHub thanks wall
    feedback/      # example feedback box: submit/list/admin governance — the teach-by-example slice
    i18n/          # dictionaries (en/zh) + provider
    seo/           # sitemap, robots, locale head tags
    docs/          # fumadocs source/layout config + llms.txt text generation
    admin/         # admin plugin wiring + dashboard
    analytics/     # CF Web Analytics beacon (optional)
    maintenance/   # Cron cleanup task (expired sessions/tokens/rate-limit rows)
    theme/         # dark-first theme toggle
  routes/
    {-$locale}/    # locale-prefixed pages: /, /zh, /admin, /app, ...
    api/, docs/, docs-md/, llms.txt, robots.txt, sitemap.xml   # top-level routes (outside the locale group)
  content/docs/    # in-app docs content (fumadocs mdx sources)
  db/              # Drizzle schema barrel + client + migrations
drizzle/           # generated SQL migrations (repo root, sibling of src/)
```

## Environment variables

See [`.dev.vars.example`](.dev.vars.example) for the full list. Locally everything is optional and degrades gracefully. For production, the required secrets and how to set them are documented in [deploy](https://flarestarter.com/docs/getting-started/deploy):

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (also drives canonical/sitemap origin) — **required**; validated at startup ([security](https://flarestarter.com/docs/platform/security))
- `RESEND_API_KEY`, `EMAIL_FROM` (email; blank → console-captured)
- `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` (optional social login)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_*` (billing)
- `ADMIN_EMAILS`
- `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (optional bot protection — [security](https://flarestarter.com/docs/platform/security))
- `CF_ANALYTICS_TOKEN`, `SENTRY_DSN` (optional analytics + error reporting — [observability](https://flarestarter.com/docs/platform/observability))

Every optional integration degrades gracefully: leave its keys blank and the
feature simply turns off. The startup env validator catches misconfigurations
(missing required vars, half-configured OAuth/Turnstile pairs) and fails fast.

## Deployment

Once resources and secrets are set, shipping is two steps:

```bash
CLOUDFLARE_ENV=production pnpm build   # environment is chosen at build time (see below)
wrangler deploy
```

> Cloudflare environment is selected **at build time** via `CLOUDFLARE_ENV` (not `wrangler deploy --env`), because the Vite plugin bakes the chosen bindings into the build.

The **full first-time walkthrough** — creating D1/KV, setting secrets, running remote migrations, configuring the Stripe webhook — is in **[deploy](https://flarestarter.com/docs/getting-started/deploy)**.

> R2 (object storage) is enabled by default in `wrangler.jsonc` and wired into the code (avatar upload reference). Before deploying, create the bucket: `wrangler r2 bucket create flarestarter-files` (see [storage](https://flarestarter.com/docs/features/storage)).

## Documentation

Docs are built into the main app — visit `/docs` to read them (powered by
[Fumadocs](https://fumadocs.dev), deployed with the app, no separate Worker).
Content lives in [`src/content/docs/`](src/content/docs/):

- [`install.mdx`](src/content/docs/getting-started/install.mdx) — local setup
- [`deploy.mdx`](src/content/docs/getting-started/deploy.mdx) — production deployment
- [`billing.mdx`](src/content/docs/features/billing.mdx) — billing & subscriptions, failed-payment (dunning) handling
- [`security.mdx`](src/content/docs/platform/security.mdx) — security headers/CSP, env validation, rate limiting, per-plan quotas, Turnstile
- [`observability.mdx`](src/content/docs/platform/observability.mdx) — analytics + Sentry
- [`storage.mdx`](src/content/docs/features/storage.mdx) — R2 object storage / file uploads
- [`migrations.mdx`](src/content/docs/getting-started/migrations.mdx) — D1 migration workflow
- [`i18n.mdx`](src/content/docs/features/i18n.mdx) — locale routing & SEO origin
- [`admin.mdx`](src/content/docs/features/admin.mdx) — admin bootstrap & roles
- [`feedback.mdx`](src/content/docs/features/feedback.mdx) — feedback example domain: vertical-slice anatomy + copy-me checklist (add your own feature)
- [`cf-gotchas.mdx`](src/content/docs/platform/cf-gotchas.mdx) — Cloudflare/workerd pitfalls

> **Tip:** replace this content with your own product docs once you fork.

## Community & contributing

- **Chat with us:** join the [Telegram group](https://t.me/+coaN5Ihjte9jNzZl), or scan the WeChat group QR below ("FlareStarter & 出海 SaaS 交流"), to discuss usage and building on top.
- **Follow the author:** [X (Twitter) @0xdinglv](https://x.com/0xdinglv), [Xiaohongshu (RED)](https://xhslink.com/m/19FI1djnItu) for updates and indie SaaS notes.
- **Hit a snag?** For local-run or deployment issues, open a thread on [GitHub Issues](https://github.com/FlareStarter/flarestarter/issues).

<p>
  <img src=".github/assets/wechat-group.jpg" alt="WeChat group: FlareStarter & 出海 SaaS 交流" width="240">
</p>

> The WeChat QR is refreshed periodically; if it has expired, reach us via the Telegram group or GitHub Issues.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — local setup, the checks, conventions
- [`CHANGELOG.md`](CHANGELOG.md) — notable changes

## Sponsor

❤️ Find this useful? [Sponsor the project](https://flarestarter.com/sponsor) — your avatar shows up on the live sponsor wall.

You can also tip the author by scanning the WeChat reward QR below:

<p>
  <img src=".github/assets/wechat-sponsor.jpg" alt="WeChat reward QR" width="240">
</p>

## License

[Apache License 2.0](LICENSE). Copyright 2026 FlareStarter.
