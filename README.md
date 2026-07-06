<div align="center">
  <h1>FlareStarter</h1>
  <p>基于 <strong>TanStack Start</strong> + <strong>Cloudflare Workers</strong> 的全栈、边缘原生 SaaS 起步模板。</p>
  <p>
    <a href="https://github.com/FlareStarter/flarestarter/actions/workflows/ci.yml"><img src="https://github.com/FlareStarter/flarestarter/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://github.com/FlareStarter/flarestarter/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
    <a href="https://developers.cloudflare.com/workers/"><img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare Workers"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript"></a>
  </p>
  <p>
    <i>认证、计费、邮件、i18n、SEO、运营后台——全部接好、有测试、fork 即用。</i>
  </p>
  <p>
    <a href="https://flarestarter.com"><strong>在线 Demo</strong></a> ·
    <a href="https://flarestarter.com/docs"><strong>文档</strong></a>
  </p>
  <a href="https://flarestarter.com"><img src=".github/assets/hero.png" alt="FlareStarter —— 克隆即用,今晚部署到 Cloudflare" width="100%"></a>
</div>

---

[English](README.en.md) | **简体中文**

FlareStarter 只交付能跑的东西：仓库里的每个功能都是真实实现，没有 mock、没有占位、没有为凑数而留空的 TODO。所有代码都跑在 Cloudflare 的低成本（乃至免费）技术栈上 (Workers + D1 + KV)。

## 核心优势

- **边缘原生计算**：基于 Cloudflare Workers，全球毫秒级响应，告别冷启动。
- **极低的运维成本**：巧妙利用 CF 的免费额度，0 成本起步，应对突发流量也毫无压力。
- **开箱即用**：鉴权、支付、邮件等 SaaS 必备模块全部内置，无需自己拼凑各种库。
- **端到端类型安全**：从数据库 (Drizzle) 到前端 (TanStack Start) 的全链路 TypeScript 体验。

## 预览

暗色优先设计 + 终端美学。以下均为真实运行界面——运营后台基于真实数据、无任何虚构指标。可在 [在线 Demo](https://flarestarter.com) 亲自体验。

**运营后台 · 统计仪表盘**（注册数 / 活跃 / 订阅，全部真实数据）

<p align="center">
  <img src=".github/assets/admin.png" alt="运营后台统计仪表盘" width="100%">
</p>

| 用户管理（角色 / 封禁 / 模拟登录 / 分页搜索） | 应用仪表盘（按 plan 解锁） |
|:---:|:---:|
| <img src=".github/assets/admin-users.png" alt="用户管理表" width="100%"> | <img src=".github/assets/app-dashboard.png" alt="应用仪表盘" width="100%"> |
| **定价：开源核心 + Pro 终身买断** | **Pro 门禁演示（`requirePlan`）** |
| <a href="https://flarestarter.com/pricing"><img src=".github/assets/pricing.png" alt="定价页" width="100%"></a> | <img src=".github/assets/app-pro.png" alt="Pro 专属内容" width="100%"> |
| **反馈箱（提交 + 团队回复）** | **独立赞助页（PWYW 金额分层）** |
| <img src=".github/assets/app-feedback.png" alt="反馈箱用户页" width="100%"> | <a href="https://flarestarter.com/sponsor"><img src=".github/assets/sponsor.png" alt="赞助页" width="100%"></a> |

## 包含什么

| 模块 | 能力 |
|------|------|
| **认证** | 基于 [better-auth](https://better-auth.com) 的邮箱密码登录（强制邮箱验证）、找回密码、注销账号。Google 与 GitHub OAuth ——未配置环境变量时按钮自动隐藏（优雅降级）。会话以 D1 作为唯一数据源，并配合 cookie 缓存。 |
| **计费** | [Stripe](https://stripe.com) 订阅（月付/年付）**以及**一次性终身买断、Customer Portal 入口、基于套餐的路由守卫 (`requirePlan`)、幂等 webhook 处理、可靠触发的计费事件钩子（例如「Pro 激活时发一封邮件」）。续费扣款失败时在 app 内提示更新支付方式（重试邮件交给 Stripe）——见 [计费文档](https://flarestarter.com/docs/features/billing)。 |
| **存储** | [R2](https://developers.cloudflare.com/r2/) 对象存储，内置完整的头像上传功能（包含类型与大小校验）。R2 存储桶默认非公开，图片通过服务端路由以流式代理返回。本地开发经 miniflare 零配置即可使用。这可用作后续所有文件上传功能的参考实现——见 [存储文档](https://flarestarter.com/docs/features/storage)。 |
| **邮件** | [Resend](https://resend.com) + 字符串模板（React Email 在 workerd 上不可用）。如果没配 API key，邮件会直接打印到控制台，确保本地开发不会被卡住。 |
| **等待列表 (Waitlist)** | 完整的 pre-launch 报名闭环：公开报名页、Turnstile 防刷、后台管理页 + CSV 导出，报名邮箱自动同步到 [Resend](https://resend.com) audience（未配 key 时优雅跳过）。 |
| **更新日志 (Changelog)** | MDX 驱动、按语言区分、带 `published` 开关的站内 `/changelog` 页——直接把版本记录做成产品页面，而不只是仓库里的 `CHANGELOG.md`。 |
| **赞助 (Sponsor)** | 独立 `/sponsor` 页,演示真实 Stripe 收款闭环:**纯捐赠不解锁**（不碰 entitlement）。一次性与月度均为**金额驱动**（PWYW/自定义金额,通过 `price_data.recurring` 内联创建,无需预设 Price ID）。GitHub 致谢头像墙**按金额分层展示**,支持公开留言。月度赞助可随时经 Stripe 门户取消。webhook 按 metadata 分流 + 幂等入库。未配 Stripe key 时显示「未配置」态（优雅降级）。定制赞助页改 `src/features/sponsor/sponsor.config.ts`（金额/档位/开关/阈值）与 i18n `sponsor.*` 文案,无需改组件。 |
| **反馈箱 (Feedback)** | 登录用户提交反馈 +「我的反馈」列表（可删自己 `open` 状态的条目）；后台治理页做状态流转（open/planned/shipped/closed）与一句话回复；admin 提交的反馈带 Pro 徽章（演示 `hasProAccess`）。同时是**加你自己功能的教学范本**：一个纵向切片跑通归属过滤（`db/scope`）、纯函数层、两套门控与双池测试——见 [反馈文档](https://flarestarter.com/docs/features/feedback)。 |
| **i18n** | 通过 TanStack 的 `{-$locale}` 可选前缀做路径式多语言路由——英文在 `/`，中文在 `/zh`。营销文案与 UI 字符串都已内置翻译。 |
| **SEO** | 按语言生成的 sitemap、`hreflang`、canonical URL、OpenGraph 标签、`robots.txt`，以及需登录页面的 `noindex` 处理。 |
| **AI 友好** | **部署侧**：内置 [`llms.txt`](https://flarestarter.com/llms.txt) 索引与 [`llms-full.txt`](https://flarestarter.com/llms-full.txt) 全文语料，每个文档页均可经 `/docs-md/*` 取到去除 frontmatter 的干净 Markdown，`robots.txt` 主动指向二者——便于 ChatGPT / Perplexity 等 AI 爬虫索引、引用你的内容。**代码侧**：[`AGENTS.md`](AGENTS.md)（+ 自动导入的 [`CLAUDE.md`](CLAUDE.md)）作为单一事实来源，让 Claude Code / Codex 等编码 agent 即刻读懂本仓库、直接在其上开发。 |
| **后台** | better-auth admin 插件：角色管理、账号封禁、用户模拟登录 (Impersonation)、可搜索/分页的用户表，以及统计仪表盘（注册数 / 活跃数 / 订阅）——全部基于真实数据，无任何虚构指标。 |
| **主题** | 暗色优先设计 + 亮/暗模式切换，用户偏好经 cookie 持久化。 |
| **安全 & 可观测性** | Turnstile bot 防护、安全响应头 + 生产环境 CSP、认证端点限流（D1 存储）、启动期环境变量校验（fail-fast）；CF Web Analytics（无 cookie）与 Sentry 错误上报——均可选，留空即关。见 [安全文档](https://flarestarter.com/docs/platform/security) / [可观测性文档](https://flarestarter.com/docs/platform/observability)。 |
| **运维 (Dev/Ops)** | Cron Triggers 定时任务参考实现（每日清理过期 session/token/限流行）、local/staging/prod 多环境分离、GitHub Actions CI（lint + typecheck + 构建）。 |

## 技术栈

- **[TanStack Start](https://tanstack.com/start)**（React 19、文件式路由、Server Functions）
- **[Cloudflare Workers](https://workers.cloudflare.com)** 运行时，经 `@cloudflare/vite-plugin` 部署
- **[D1](https://developers.cloudflare.com/d1/)** (SQLite) + **[Drizzle ORM](https://orm.drizzle.team)** + 数据迁移
- **[KV](https://developers.cloudflare.com/kv/)** 做缓存，**[R2](https://developers.cloudflare.com/r2/)** 做对象存储——已端到端接通（校验上传 + 私有服务路由），头像上传作参考实现
- **[better-auth](https://better-auth.com)**、**[Stripe](https://stripe.com)**、**[Resend](https://resend.com)**
- **[Tailwind CSS v4](https://tailwindcss.com)**
- **[Vitest](https://vitest.dev)**（Node 单测 + 经 `@cloudflare/vitest-pool-workers` 的 Workers/D1 集成测试）

## 前置依赖 (Prerequisites)

- **Node.js** >= 22 (推荐使用 [nvm](https://github.com/nvm-sh/nvm) 或 [volta](https://volta.sh/))
- **pnpm** >= 9
- 一个 **Cloudflare** 账号（免费档足够起步）
- `wrangler` CLI（已作为项目 dev 依赖安装，无需全局安装）

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置本地环境变量 (复制示例，按需填写)
cp .dev.vars.example .dev.vars
# 本地一切都可选 —— Stripe/Resend key 留空会优雅降级
# (无计费入口、邮件直接打印到控制台)。

# 3. 建立本地 D1 表结构
pnpm db:migrate:local

# 4. 跑起来！
pnpm dev          # 访问 http://localhost:3000
```

### 常用脚本

```bash
pnpm dev               # 启动开发服务器 (:3000)
pnpm build             # 生产环境构建
pnpm test              # 全量测试 (Vitest)
pnpm typecheck         # 运行 tsc --noEmit
pnpm lint              # 运行 eslint
pnpm db:generate       # 从 schema 变更生成 Drizzle 迁移文件
pnpm db:migrate:local  # 对本地 D1 应用迁移
pnpm db:reset:local    # 清空 + 重新迁移 + 重新填充测试数据 (seed), 本地 D1
pnpm cf-typegen        # 从 wrangler.jsonc 重新生成 worker-configuration.d.ts
```

## 目录结构

```text
src/
  features/        # 按业务逻辑纵向切片，每个模块自包含
    auth/          # better-auth 配置、中间件、社交登录按钮
    billing/       # Stripe provider、权益控制、webhook、事件钩子
    storage/       # R2 对象存储：校验上传 + 服务路由 (如头像)
    email/         # Resend 客户端 + 字符串模板
    waitlist/      # 报名页 + Turnstile + 后台管理 + CSV 导出 + Resend audience 同步
    audience/      # Resend 联系人/受众同步（waitlist 复用，未来 newsletter）
    changelog/     # MDX 驱动的站内更新日志页 (/changelog)
    sponsor/       # 独立赞助页:一次性/月度 Stripe 收款 + GitHub 致谢墙
    feedback/      # 示例反馈箱:提交/我的列表/后台治理 —— 加自己功能的教学范本
    i18n/          # 语言字典 (en/zh) + provider
    seo/           # sitemap、robots、多语言 head 标签
    docs/          # fumadocs 源/布局配置 + llms.txt 文本生成
    admin/         # admin 插件接线 + 仪表盘
    analytics/     # CF Web Analytics beacon (可选)
    maintenance/   # Cron 定时清理任务 (过期 session/token/限流行)
    theme/         # 暗色优先的主题切换
  routes/
    {-$locale}/    # 带可选语言前缀的页面：/、/zh、/admin、/app …
    api/, docs/, docs-md/, llms.txt, robots.txt, sitemap.xml   # 顶级路由（locale 组之外）
  content/docs/    # 站内文档内容 (fumadocs 的 mdx 源)
  db/              # Drizzle schema barrel + client + 迁移逻辑
drizzle/           # 生成的 SQL 迁移文件（仓库根，与 src/ 同级）
```

## 环境变量

完整清单见 [`.dev.vars.example`](.dev.vars.example)。本地开发时一切可选，支持优雅降级。生产环境所需的 secrets 及配置方式见 [部署文档](https://flarestarter.com/docs/getting-started/deploy)：

- `BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`（同时决定 canonical / sitemap origin）—— **必填**；启动时校验（见 [安全文档](https://flarestarter.com/docs/platform/security)）。
- `RESEND_API_KEY`、`EMAIL_FROM`（邮件服务；留空则由控制台捕获）。
- `GOOGLE_CLIENT_ID/SECRET`、`GITHUB_CLIENT_ID/SECRET`（可选社交登录）。
- `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PRICE_PRO_*`（计费服务）。
- `ADMIN_EMAILS`（管理员邮箱）。
- `TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY`（可选的 bot 防护——见 [安全文档](https://flarestarter.com/docs/platform/security)）。
- `CF_ANALYTICS_TOKEN`、`SENTRY_DSN`（可选的数据分析 + 错误上报——见 [可观测性文档](https://flarestarter.com/docs/platform/observability)）。

**优雅降级机制**：每个可选集成均支持优雅降级。如果留空对应的 key，该功能即自动关闭。启动期的环境变量校验会拦截错误的配置（如缺失必填项、OAuth/Turnstile 配置不全等），并触发快速失败 (fail-fast)，避免在运行时产生意料之外的错误。

## 部署

资源与 secrets 配好后，上线只需两步：

```bash
CLOUDFLARE_ENV=production pnpm build   # 环境在构建时选定（见下）
wrangler deploy
```

> Cloudflare 运行环境在**构建时**通过 `CLOUDFLARE_ENV` 选定（而不是在部署时通过 `wrangler deploy --env`），因为 Vite 插件会将选定环境的 bindings 直接注入到构建产物中。

首次部署的**完整流程**——创建 D1/KV、设置 secrets、执行远程数据迁移、配置 Stripe webhook 等——请参阅 **[部署文档](https://flarestarter.com/docs/getting-started/deploy)**。

> **提示**：R2 (对象存储) 已在 `wrangler.jsonc` 中默认启用并接入代码（头像上传参考实现）。部署前先在 Cloudflare 建桶：`wrangler r2 bucket create flarestarter-files`（见 [存储文档](https://flarestarter.com/docs/features/storage)）。

## 文档

项目文档已内置于主应用，访问 `/docs` 即可阅读（基于 [Fumadocs](https://fumadocs.dev)，随应用一同部署）。
文档源文件存放在 [`src/content/docs/`](src/content/docs/) (中文版)：

- [`install.mdx`](src/content/docs/getting-started/install.mdx) —— 本地环境安装
- [`deploy.mdx`](src/content/docs/getting-started/deploy.mdx) —— 生产环境部署
- [`billing.mdx`](src/content/docs/features/billing.mdx) —— 计费与订阅、扣款失败（dunning）处理
- [`security.mdx`](src/content/docs/platform/security.mdx) —— 安全响应头/CSP、环境变量校验、接口限流、按 plan 配额、Turnstile 验证码
- [`observability.mdx`](src/content/docs/platform/observability.mdx) —— 访问分析 + Sentry 接入
- [`storage.mdx`](src/content/docs/features/storage.mdx) —— R2 对象存储与文件上传
- [`migrations.mdx`](src/content/docs/getting-started/migrations.mdx) —— D1 数据库迁移流程
- [`i18n.mdx`](src/content/docs/features/i18n.mdx) —— 语言路由 & SEO origin 处理
- [`admin.mdx`](src/content/docs/features/admin.mdx) —— 运营后台引导 & 角色权限
- [`feedback.mdx`](src/content/docs/features/feedback.mdx) —— 反馈箱示例域:垂直切片解剖 + 照抄清单（加你自己的功能）
- [`cf-gotchas.mdx`](src/content/docs/platform/cf-gotchas.mdx) —— Cloudflare / workerd 踩坑记录

> **建议**：上线后，可以将这些内容替换为你自己的产品文档（或者继续用它来记录你的项目开发心得）。

## 社区与贡献

- **遇到问题？** 本地运行或部署遇到问题，欢迎在 [GitHub Issues](https://github.com/FlareStarter/flarestarter/issues) 讨论。
- [`CONTRIBUTING.md`](CONTRIBUTING.md) —— 本地开发环境搭建、检查项与代码约定
- [`CHANGELOG.md`](CHANGELOG.md) —— 版本变更记录

## 赞助 / Sponsor

❤️ 觉得这个项目有用？[赞助我们](https://flarestarter.com/sponsor)——你的头像会实时出现在官网赞助墙。

## 许可证

本项目基于 [Apache License 2.0](LICENSE) 开源协议。Copyright 2026 FlareStarter。
