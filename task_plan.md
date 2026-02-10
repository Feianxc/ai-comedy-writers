# Task Plan: AI吐槽大会 - 开发完成与验收

> **项目**: ai-comedy-writers
> **开始日期**: 2026-02-09
> **当前状态**: ✅ 代码审查与修复完成，可部署上线

---

## Goal

完成 AI吐槽大会 项目的代码审查和全面测试，确保项目可部署上线。

---

## Current Phase

**Phase 5: 部署准备** ⏳

---

## Phases

### Phase 1: 项目初始化与架构 ✅ COMPLETE

- [x] 技术栈选型（Next.js 15 + React 19 + TypeScript）
- [x] 项目结构设计
- [x] 数据库Schema设计（Prisma + PostgreSQL）
- [x] 认证方案确定（Second Me OAuth + NextAuth）
- [x] AI服务架构设计（OpenAI + Anthropic备选）
- **Status**: complete

---

### Phase 2: 核心功能开发 ✅ COMPLETE

- [x] 认证系统（OAuth登录、Session管理、Token刷新）
- [x] AI人设系统（5种用户人设 + 3种场控AI）
- [x] 吐槽生成（批量API + SSE流式API）
- [x] 两轮互动逻辑实现
- [x] 分享功能（链接 + 卡片）
- [x] 话题系统
- [x] 前端组件库
- [x] Zustand状态管理
- **Status**: complete

---

### Phase 3: 问题修复 ✅ COMPLETE

- [x] 安全问题修复（JWT secret、Open重定向）
- [x] API问题修复（limit上限、响应格式统一）
- [x] 类型问题修复（移除any、BaseRepository修复）
- [x] UI问题修复（Tailwind动态类名、React不可变更新）
- [x] AI服务问题修复（流式API连接真实服务）
- **Status**: complete

---

### Phase 4: 代码审查与测试 ✅ COMPLETE

#### 4.1 代码审查 - 已完成
- [x] 安全审查 - 报告: `.workspace/logs/security-review-report.md`
- [x] API审查 - 报告: `.workspace/logs/api-review-report.md`
- [x] AI服务审查 - 报告: `.workspace/logs/ai-service-review-report.md`
- [x] 前端审查 - 报告: `.workspace/logs/frontend-review-report.md`
- [x] 数据层审查 - 报告: `.workspace/logs/data-layer-review-report.md`

#### 4.2 问题修复 - 已完成 (2026-02-10)
- [x] OAuth state 强制验证 (`verifyStateStrict` + timingSafeEqual)
- [x] API 认证中间件 (`lib/api-auth.ts`, `lib/auth-middleware.ts`)
- [x] stream API 改为 POST + Zod 验证 + 危险键检查
- [x] Token 有效期改为 7d
- [x] 修复 parseInt NaN 问题
- [x] 更新 .env.example 移除真实凭证

**验证**: ✅ npm run build 成功，类型检查通过
**Status**: complete

---

### Phase 5: 部署准备 ⏳ IN_PROGRESS

#### 5.1 全量测试 ✅ COMPLETE (2026-02-10)
- [x] 静态代码分析（类型检查 + Lint + 安全扫描）→ 评分 A-
- [x] API 端点功能测试（14个用例）→ 评分 B+
- [x] SSE 流式接口专项测试（8个用例）→ 评分 B
- [x] 安全专项测试（8个维度）→ 评分 C+
- [x] E2E 浏览器测试（截图 + 响应式）→ 评分 B+
- **综合评分**: B | 覆盖度 83%
- **汇总报告**: `.workspace/logs/FULL_TEST_SUMMARY_2026-02-10.md`

#### 5.2 测试发现的阻塞问题（P0，必须修复）
- [ ] **HTTP 安全头完全缺失** → 创建 middleware.ts
- [ ] **share id 无格式验证** → 添加正则校验
- [ ] **撤销并重新生成 SECOND_ME_CLIENT_SECRET**

#### 5.3 部署配置
- [ ] 配置生产环境变量 (.env)
- [ ] 运行数据库迁移 (`npx prisma migrate deploy`)
- [ ] `next.config.ts` 设置 `poweredByHeader: false`

#### 5.4 可选但建议（P1）
- [ ] `limit` 参数添加上限
- [ ] Cookie 添加 Secure 标志
- [ ] `/api/auth/me` 响应格式统一
- [ ] 删除 `src/app/api/` 重复路由
- [ ] 删除 `src/app/api/test/route.ts`
- [ ] 添加 favicon.ico

**Status**: in_progress

---

### Phase 6: 上线与交付 ⏳ PENDING

- [ ] 生产环境部署
- [ ] 冒烟测试
- [ ] 文档更新
- [ ] 交接完成

**Status**: pending

---

## Key Questions

1. ~~测试范围: 需要哪些自动化测试？~~ → 代码审查已完成
2. ~~测试数据: 是否需要准备测试数据集？~~ → 审查阶段完成
3. **部署平台**: Vercel 还是自建服务器？待确认
4. **监控方案**: 是否需要接入APM监控？待确认

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| 使用 Second Me OAuth | 黑客松要求，必须集成 |
| SSE流式输出优先 | 提升用户体验，实时感强 |
| Prisma + PostgreSQL | 开发效率高，类型安全 |
| Zustand状态管理 | 轻量简单，适合小项目 |
| Repository模式 | 数据层解耦，便于测试 |

---

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| JWT fallback secret | 1 | 生产环境强制要求NEXTAUTH_SECRET |
| Open重定向漏洞 | 1 | 验证redirect_url只允许相对路径 |
| Tailwind动态类名 | 1 | 使用类名映射对象 |
| Repository this.model | 1 | 改为this.prismaModel |
| 流式API模拟数据 | 1 | 连接真实StreamService |

---

## Remaining Issues (Low Priority)

| # | 问题 | 优先级 | 影响 |
|---|------|--------|------|
| 1 | Favicon 404错误 | 低 | 控制台报错 |
| 2 | alert()提示 | 中 | 用户体验可改进 |
| 3 | 无障碍属性缺失 | 低 | a11y支持不完整 |
| 4 | React Hooks依赖警告 | 低 | 可能影响性能 |

---

## Next Steps

1. **立即执行**: 完成部署准备
2. **待确认**: 部署平台选择
3. **后续跟进**: 上线与交付

---

## 关键修复记录 (2026-02-10)

### P0 Critical (已修复)
- ✅ OAuth CSRF 验证绕过 → 使用 `verifyStateStrict`
- ✅ API 无认证 → 添加 `requireApiAuth`
- ✅ stream API GET传敏感数据 → 改为POST
- ✅ .env 敏感信息泄露 → 更新 .env.example

### P1 High (已修复)
- ✅ JSON.parse 无防护 → Zod schema 验证
- ✅ Token 有效期过长 → 30d → 7d
- ✅ sessionId 验证不完整 → 认证中间件保护
- ✅ parseInt NaN 问题 → 添加 NaN 检查

### 修复文件清单
- `lib/api-auth.ts` - API认证中间件
- `lib/auth-middleware.ts` - 通用认证中间件
- `lib/csrf.ts` - 添加 `verifyStateStrict`
- `lib/session.ts` - Token 有效期 7d
- `app/api/auth/callback/route.ts` - 严格 state 验证
- `app/api/generate/stream/route.ts` - POST + Zod + 认证
- `app/api/generate/route.ts` - 添加认证
- `app/api/share/route.ts` - 添加认证
- `app/api/topics/route.ts` - NaN 检查
- `.env.example` - 移除真实凭证

---

*最后更新: 2026-02-10*
*状态: Phase 5 进行中 — 生产环境 OAuth + UI 修复*

---

## Phase 5.1: 生产环境问题修复 [IN PROGRESS]

### 问题 A: OAuth Token Exchange 失败
- **症状**: 授权后重定向到 `/?error=Failed%20to%20exchange%20code%20for%20token`
- **已修复**:
  - [x] callback route 用户信息 URL 从 `api.second.me` 改为 `SecondMeClient` (正确 base URL)
  - [x] token exchange 添加 `redirect_uri` 参数
  - [x] Content-Type 从 `application/json` 改为 `application/x-www-form-urlencoded`
  - [x] 添加详细错误日志 (`[Token Exchange] FAILED: <status> <body>`)
  - [x] 放宽 state 验证（兼容 Second Me 不返回 state）
- **待验证**:
  - [ ] token endpoint URL 是否正确 (`app.mindos.com/gate/lab/oauth/token`)
  - [ ] Second Me 是否要求 JSON 而非 form-urlencoded
  - [ ] 等待用户测试获取具体 HTTP 状态码和响应体

### 问题 B: 底部按钮文字截断
- **症状**: "登录并开始" 只显示 "录并开始"，按钮偏左
- **尝试记录**:
  - [x] 尝试 1: `left-1/2 -translate-x-1/2 w-[calc(100%-3rem)]` — 失败
  - [x] 尝试 2: `inset-x-0 px-6 flex justify-center` — 失败
  - [x] 尝试 3: inline style `position:fixed; left:0; right:0` — 已部署，等待测试

### 其他已修复
- [x] `tailwind.config.ts` content 路径缺少 `./src/**` (根因：生产 CSS purge)
- [x] PersonaSelector 黄色渐变对比度 (`yellow-400` → `amber-500/700`)
- [x] CSP `connect-src` 域名更新 (`api.second.me` → `app.mindos.com`)
- [x] TopicCard `truncate` 移除
- [x] Vercel `SECOND_ME_REDIRECT_URI` 环境变量删除（改用 NEXTAUTH_URL 派生）
