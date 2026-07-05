# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Storage** — Cloudflare R2 object storage wired end-to-end, with a working
  avatar upload (validated upload + private serving route). Zero-config locally
  via miniflare. See [`src/content/docs/storage.md`](src/content/docs/storage.md).
- **Security headers** — baseline headers (X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy, Permissions-Policy, HSTS) on every response, plus a production
  Content-Security-Policy, via a custom worker entry.
- **Error boundary** — a styled 500 page (`defaultErrorComponent`) so uncaught
  render/loader errors no longer blank the screen.
- **Environment validation** — fail-fast zod schema validates required env on
  startup; conditional rules for OAuth pairs and Stripe; clear aggregated errors.
- **Bot protection** — optional Cloudflare Turnstile on sign-up / sign-in /
  password-reset, enabled when `TURNSTILE_*` keys are set (degrades gracefully).
- **Governance** — `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and
  this changelog.

### Notes

- This is the pre-release baseline. The first tagged release will become `[1.0.0]`.
- Known gaps tracked for production hardening: per-endpoint auth rate limiting,
  error/abuse monitoring, and analytics.

[Unreleased]: https://github.com/flarestarter/flarestarter/commits/main
