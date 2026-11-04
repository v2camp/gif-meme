# GifMeme

GifMeme 是一个基于 **Next.js 15**、**OpenNext for Cloudflare** 和 **Cloudflare Workers** 构建的全栈 GIF 浏览网站。

它包含以下能力：

- 通过 **Klipy API** 浏览 GIF / Sticker
- **Google OAuth 2.0** 登录
- 基于 **Cloudflare D1** 的收藏功能
- 基于 **Cloudflare KV** 的响应缓存
- 基于 **Cloudflare Analytics Engine** 的访问统计
- 部署到生产域名 **gifmeme.org**

---

## 技术栈

- Next.js 15
- React 19
- `@opennextjs/cloudflare`
- Wrangler 4
- Drizzle ORM + Cloudflare D1
- Cloudflare KV
- Cloudflare Analytics Engine
- Vitest + Playwright

---

## 免费套餐上的请求路径

Workers 免费套餐每次请求只有 10 毫秒 CPU。公开页面如果在 Worker 里做 Next.js 服务端渲染，单次就要 200 毫秒以上，会被记成 CPU 超限。

现在的分工是：

- `/`、`/search`、`/login`、`/favorites` 在构建时预渲染成 HTML。`scripts/publish-static-shells.mjs` 把它们写进 Workers 静态资源，请求不进入 Worker。
- `/gif/:id`、`/category/:slug`、`/embed/:id` 复用同一个静态壳。Worker 只把壳从静态资源里取出来，不跑 React。
- 页面在浏览器里请求 `/api/gifs/*`、`/api/stickers/*`、`/api/categories`。这些读接口由 Worker 入口直接代理 Klipy / D1，不加载 OpenNext。
- 登录、收藏写入、管理后台仍走 OpenNext。响应标成 `private, no-store`。
- 根布局不再读取 Cookie，中间件也不再给匿名访问写 `visitor_id`。否则 HTML 无法被静态资源或缓存复用。
- 已登录状态看非 HttpOnly 的 `signed_in` Cookie，只有这时才会请求 `/api/auth/me`。

不要把 `run_worker_first` 设成 `true`，那会让静态文件重新进入 Worker。

---

## 仓库结构

```text
src/
  app/                 # App Router 页面和 API 路由
  components/          # UI 组件
  lib/
    auth/              # Google OAuth + JWT Session 逻辑
    db/                # D1 + Drizzle schema
    klipy/             # Klipy provider、广告解析、缓存
    analytics/         # 统计采集和查询逻辑
drizzle/               # SQL migrations
tests/                 # Playwright E2E 测试
scripts/deploy.sh      # 生产部署脚本
wrangler.toml          # Cloudflare Workers 配置
```

---

## 前置依赖

开始之前，请确保本地具备：

- **Node.js 20+**
- **npm**
- **Wrangler 4+**
- 一个 **Cloudflare 账号** （Done, 已经配置好 MCP API 密钥）
- 一个 **Google OAuth 应用** （Done, 已经配置好客户端 ID 和密钥）
- 一个 **Klipy API Key**

推荐额外准备：

- `bc`（`scripts/deploy.sh` 用于输出 bundle 大小）
- Playwright 浏览器二进制：

```bash
npx playwright install
```

---

## 必需的 Cloudflare 资源

当前项目依赖以下 Cloudflare 资源：

- **D1 数据库**：`gifmeme-db`
- **KV Namespace**（绑定名）：`cache`
- **Analytics Engine Dataset**（绑定名）：`gifmeme-analytics`
- **Workers 路由**：`gifmeme.org/*`

这些绑定声明在 `wrangler.toml` 中。

> 注意：当前 `wrangler.toml` 中 D1 和 KV 仍是占位 ID，正式预览或生产部署前必须替换成真实资源 ID。

---

## 必需环境变量 / Secrets

### 应用 / 登录认证

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `ADMIN_EMAILS`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_BASE_URL`

### 内容 / API

- `KLIPY_API_KEY`

### 统计后台

- `CF_ACCOUNT_ID`
- `CF_ANALYTICS_TOKEN`

---

## 本地配置指引

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Cloudflare 资源

如果还没有相关资源，可以先创建：

```bash
npx wrangler d1 create gifmeme-db
npx wrangler kv namespace create cache
```

然后把生成的真实 `database_id` 和 KV `id` 填回 `wrangler.toml`。

### 3. 应用本地或远程 migration

至少先确认仓库中的 migration 文件：

```bash
ls drizzle/
```

当前仓库包含：

- `drizzle/0000_perfect_photon.sql`

生产部署脚本中远程应用 migration 的方式为：

```bash
wrangler d1 execute gifmeme-db --file=drizzle/0000_perfect_photon.sql --remote
```

### 4. 设置本地环境变量 / secrets

本地开发请使用**本地文件**，不要手动 `export`，也不要把真实凭据写进仓库。

先复制模板：

```bash
cp .env.local.example .env.local
cp .dev.vars.example .dev.vars
```

然后把真实值填进这两个本地文件中：

- `.env.local`：给 Next.js / 本地脚本使用
- `.dev.vars`：给 `wrangler dev` 的本地 Worker secrets 使用

推荐至少填写：

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...
KLIPY_API_KEY=...
ADMIN_EMAILS=admin@example.com,another-admin@example.com
LOCAL_PORT=8787
NEXT_PUBLIC_APP_URL=http://localhost:8787
NEXT_PUBLIC_BASE_URL=http://localhost:8787
PLAYWRIGHT_BASE_URL=http://localhost:8787
```

可选统计变量：

```dotenv
CF_ACCOUNT_ID=...
CF_ANALYTICS_TOKEN=...
```

> 注意：Wrangler 本地开发建议在 `.dev.vars` 和 `.env` / `.env.local` 方案中保持职责清晰。此仓库默认使用 `.dev.vars` 承载 Worker 本地 secrets，使用 `.env.local` 承载本地运行配置。

对于 Cloudflare 托管运行环境，生产 secrets 通过 Wrangler 设置：

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
npx wrangler secret put KLIPY_API_KEY
npx wrangler secret put ADMIN_EMAILS
```

---

## 本地开发

### 一键完整联调（推荐）

```bash
npm run local:start
```

这个脚本会自动完成：

1. 检查并补齐 `.env.local` / `.dev.vars`
2. 自动寻找可用端口（默认从 `8787` 开始）
3. 构建 OpenNext Worker
4. 初始化本地 D1 持久化目录
5. 幂等执行 `drizzle/*.sql` migration（已执行过的会跳过）
6. 启动 `wrangler dev`

如果 `8787` 已被占用，脚本会自动切换到下一个可用端口，并同步更新运行时使用的本地 URL。

> Google OAuth 注意：如果脚本因为端口冲突切换到了新端口，你需要把新的 `http://localhost:PORT/api/auth/callback` 加到 Google OAuth 应用的 authorized redirect URI 里，否则登录回调会失败。

### 快速 UI 开发

```bash
npm run dev
```

该命令会启动 Next.js 本地开发环境。

### 完整联调 / 集成测试

当你需要以下能力时，请使用 Workers 风格的本地运行方式：

- D1 / KV / Analytics Engine 绑定
- 通过 Worker 跑通 API 路由
- 更接近生产的页面到 API 集成行为

当前项目中有部分服务端页面直接请求 `http://localhost:8787`，因此 **完整联调建议使用监听 `8787` 端口的本地运行方式**。

典型流程：

```bash
npx opennextjs-cloudflare build
npx wrangler dev --port 8787
```

然后访问：

```text
http://localhost:8787
```

> 注意：如果缺少 Klipy API、D1 或认证相关 secrets，一些页面会优雅降级为 empty state 或受保护页面回退，而不是展示完整功能。

---

## 本地测试指引

### 类型检查

```bash
npx tsc --noEmit
```

### 单元 / 集成测试

```bash
npm test
```

等价命令：

```bash
npx vitest run
```

### E2E 测试

```bash
npm run test:e2e
```

该命令会运行 Playwright 测试。

### 推荐本地验证顺序

```bash
npx tsc --noEmit
npx vitest run
npx opennextjs-cloudflare build
```

如果你使用一键联调脚本，本地地址会和 `LOCAL_PORT` / `PLAYWRIGHT_BASE_URL` 保持一致。

如果还需要验证浏览器真实流程：

```bash
npx wrangler dev --port 8787
npx playwright test
```

---

## 预上线检查清单

在 preview 或 production 发布前，请确认：

- `git status` 为 clean
- `wrangler.toml` 中 D1 / KV 的 ID 已替换为真实值，而不是 placeholder
- 所有必需 secrets 已配置
- `npx tsc --noEmit` 通过
- `npx vitest run` 通过
- `npx opennextjs-cloudflare build` 通过
- 如适用，`npx playwright test` 通过
- `.open-next/worker.js` 成功生成
- 生产路由配置正确：

```toml
routes = [
  { pattern = "gifmeme.org/*", zone_name = "gifmeme.org" }
]
```

---

## 预上线 / 预发布验证

正式对外发布前，建议做一次完整验证：

### 功能检查

- 首页可访问
- 搜索功能可用
- 分类页可访问
- GIF 详情页可访问
- Google OAuth 跳转正常
- Favorites 页面需要登录
- Admin 页面保持受保护状态
- Dark mode 正常
- Mobile 布局可接受

### 基础设施检查

- D1 migration 已执行
- KV 缓存正常
- Analytics 后台可以查询数据
- `NEXT_PUBLIC_APP_URL` 和 `NEXT_PUBLIC_BASE_URL` 指向正确环境

### Smoke 检查命令

```bash
curl -s -o /dev/null -w "%{http_code}" https://gifmeme.org
curl -s -o /dev/null -w "%{http_code}" https://gifmeme.org/api/gifs/trending
curl -s -o /dev/null -w "%{http_code}" https://gifmeme.org/admin
```

---

## 上线发布指引

### 推荐方式

优先使用仓库内置部署脚本：

```bash
./scripts/deploy.sh
```

该脚本会依次执行：

1. Type check
2. Vitest 测试
3. OpenNext Cloudflare build
4. Worker bundle 大小输出
5. Wrangler secret 设置提示
6. `wrangler deploy`
7. 远程 D1 migration
8. 基础生产 smoke test

### 手动发布流程

如果你需要手动发布，可使用：

```bash
npx tsc --noEmit
npx vitest run
npx opennextjs-cloudflare build
npx wrangler deploy
for migration in drizzle/*.sql; do
  npx wrangler d1 execute gifmeme-db --file="$migration" --remote
done
```

### 发布后验证

```bash
curl -s https://gifmeme.org
curl -s https://gifmeme.org/api/gifs/trending
curl -s -o /dev/null -w "%{http_code}" https://gifmeme.org/admin
```

同时建议人工确认：

- 首页内容是否正常渲染
- 登录入口是否可用
- Favorites 流程是否仍能正确跳转
- Admin 访问控制是否仍然有效

---

## Admin Operations Guide

本节用于管理员日常维护分类和分类卡片配置。

### 1. 访问分类管理页面

- 入口地址：`/admin/categories`
- 建议先完成管理员登录，再直接访问该路径

### 2. 分类 CRUD 字段说明

在分类创建和编辑时，重点维护以下字段：

- `slug`：分类 URL 标识，建议使用短横线连接英文词（如 `cat-memes`）
- `label`：分类展示名称
- `searchQuery`：用于内容源检索的关键词
- SEO 字段：用于分类页搜索引擎信息（通常包含 title、description、keywords）
- `sortOrder`：分类排序值，数字越小越靠前

常见操作流程：

1. 新建分类，填写以上字段后保存
2. 在分类列表中编辑已有分类并更新字段
3. 删除不再使用的分类

### 3. 分类卡片注入（Card Injection）

每个分类都可配置注入卡片，核心字段如下：

- `position`：注入位置
- `imageUrl`：卡片图片地址
- `imageName`：卡片图片名称或描述
- `linkUrl`：卡片跳转链接

`position` 采用 **0-based** 编号：

- `0` 表示第 1 个位置
- `1` 表示第 2 个位置
- `5` 表示第 6 个位置

卡片插入后，原有内容会按顺序后移。

---

## 本地运行注意事项

- 若干服务端页面会请求 `http://localhost:8787`
- 因此 `npm run dev` 更适合快速开发，**完整联调更推荐 Workers-compatible 的本地运行方式**
- 如果缺少 `KLIPY_API_KEY`，内容可能退化为空状态或 mock 友好行为，而不是展示真实 API 数据
- 如果缺少 D1 绑定，auth / favorites / admin 流程不会表现得像生产环境

---

## 常用命令

```bash
# 安装依赖
npm install

# 一键完整本地联调（含本地 D1 初始化）
npm run local:start

# Next.js 本地开发
npm run dev

# 构建 Worker bundle
npm run build:worker

# 预览 Worker 输出
npm run preview

# 单元测试
npm test

# E2E 测试
npm run test:e2e

# 生产部署脚本
./scripts/deploy.sh
```
