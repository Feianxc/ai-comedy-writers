# Findings & Decisions

> **项目**: ai-comedy-writers
> **最后更新**: 2026-02-10

---

## Requirements

### 产品需求

- **核心概念**: AI代理人社交游戏，用户选择AI人设后，让AI替身参与"吐槽大会"
- **产品定位**: 赛道三「无人区」- 实验性A2A应用
- **核心价值**:
  - 用户价值: 低压力表达，AI替你说出那些想说但不敢说的话
  - A2A价值: 多个AI自主发起、互怼、引用回应
  - 娱乐价值: 失控娱乐+AI群像剧，每次都是开盲盒体验

### 功能需求

- [x] Second Me OAuth登录
- [x] AI人设选择（5种用户人设）
- [x] 吐槽大会（用户AI + 3个场控AI两轮互怼）
- [x] 实时流式输出（SSE）
- [x] 分享卡片
- [x] 话题系统

### 技术需求

- [x] TypeScript 类型安全
- [x] 响应式设计
- [x] OAuth 2.0 认证
- [x] SSE 流式输出
- [x] 数据持久化

---

## Research Findings

### 技术选型调研

| 技术 | 选择原因 | 替代方案 |
|------|----------|----------|
| Next.js 15 | App Router成熟，Server Components支持 | Remix, SvelteKit |
| React 19 | 最新特性，性能提升 | React 18 |
| Tailwind CSS | 快速开发，一致性高 | CSS Modules, styled-components |
| Zustand | 轻量简单，学习成本低 | Redux, Jotai |
| Prisma | 类型安全，开发体验好 | Drizzle, TypeORM |
| NextAuth | OAuth集成简单，官方推荐 | Auth.js, Clerk |

### AI服务调研

| 服务 | 优势 | 劣势 |
|------|------|------|
| OpenAI | 响应快，质量稳定 | 价格较高 |
| Anthropic | 长文本处理能力强 | 响应稍慢 |

**决策**: 主用 OpenAI，Anthropic 作为降级备选。

---

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **SSE 而非 WebSocket** | 单向数据流，SSE更简单，浏览器原生支持 |
| **Repository 模式** | 数据层解耦，便于测试和替换ORM |
| **httpOnly Cookie** | 存储JWT，防止XSS攻击 |
| **短码分享链接** | Base62编码，6位可生成568亿组合 |
| **类名映射对象** | 解决Tailwind动态类名拼接问题 |
| **不可变状态更新** | React最佳实践，避免意外副作用 |

---

## 代码审查发现 (2026-02-10)

### ✅ 已修复的问题

**P0 (Critical)**:
- [x] OAuth state 强制验证 - 使用 `verifyStateStrict` + timingSafeEqual
- [x] API 无认证 - `/api/generate/*` 和 `/api/share` 已有 `requireApiAuth`
- [x] stream API 改为 POST - 已改为 POST 请求
- [x] .env 敏感信息 - 已更新 .env.example 移除真实凭证

**P1 (High)**:
- [x] JSON.parse 验证 - stream API 已使用 Zod schema 验证
- [x] Token 有效期 - 已从 30d 改为 7d
- [x] parseInt NaN - topics API 已修复 NaN 检查

**P2 (Medium)**:
- [x] 错误信息泄露 - 统一使用用户友好错误消息

### ⚠️ 剩余问题（建议后续修复）

| 优先级 | 问题 | 建议 |
|--------|------|------|
| P2 | RefreshToken 暴露链路 | 改为服务端加密存储 |
| P3 | 认证双轨并存 | 统一使用一套认证系统 |
| P3 | 数据层 token 明文存储 | 添加加密存储 |
| P2 | 无限流机制 | 添加 rate limiting |

### 原始审查发现（以下问题已修复）

### 🔴 严重问题 (P0 - 阻塞上线)

| 问题 | 位置 | 影响 | 修复建议 |
|------|------|------|----------|
| API 无认证 | `/api/generate/*` | 任何人可调用高成本API | 添加认证中间件 |
| stream API 使用 GET | `/api/generate/stream` | 敏感数据在URL中 | 改为POST |
| CSRF 验证弱化 | `lib/csrf.ts` | WebView环境可绕过 | 使用PKCE |
| .env 敏感信息泄露 | `.env:2-3` | Client Secret已暴露 | 撤销并重新生成 |

### 🟡 高优先级 (P1 - 上线前修复)

| 问题 | 位置 | 影响 | 修复建议 |
|------|------|------|----------|
| JSON.parse 无防护 | `stream/route.ts:25` | 原型污染风险 | 使用Zod验证 |
| sessionId 验证不完整 | `/api/share/route.ts` | 可伪造session | 使用CUID验证 |
| 降级逻辑错误 | `ai-service.ts:223` | 无法切换Provider | 修复withFallback |
| Token 有效期过长 | `lib/session.ts:39` | 泄露后风险窗口大 | 缩短到7-14天 |

### 🟢 中优先级 (P2 - 可延后)

| 问题 | 位置 | 影响 | 修复建议 |
|------|------|------|----------|
| 错误信息泄露 | 多处API | 泄露内部信息 | 统一错误码 |
| Cookie名称硬编码 | `/api/auth/me` | 生产环境cookie读不到 | 检查`__Secure-`前缀 |
| EventSource 闭包问题 | `experience/page.tsx` | 可能引用旧数据 | 重构SSE逻辑 |
| 重复的ShareCard组件 | `components/business/` | 命名混乱 | 合并或重命名 |

### 低优先级 (P3 - 代码质量)

| 问题 | 位置 | 影响 | 修复建议 |
|------|------|------|----------|
| 冗余索引 | `prisma/schema.prisma` | 轻微性能影响 | 移除unique字段索引 |
| parseInt NaN问题 | `/api/topics` | limit可能为NaN | 添加NaN检查 |
| 未使用的useStream hook | `hooks/useStream.ts` | 代码未使用 | 在页面中引用或删除 |

## Issues Encountered

### 安全问题

| Issue | Severity | Resolution |
|-------|----------|------------|
| JWT使用fallback secret | 高 | 生产环境强制要求NEXTAUTH_SECRET |
| Open重定向漏洞 | 高 | 验证redirect_url只允许相对路径 |

### API问题

| Issue | Resolution |
|-------|------------|
| limit参数无上限 | 添加Math.min限制最大100 |
| 响应格式不一致 | 统一为{code, data}格式 |
| 重复的API端点 | 删除src/app/api下重复文件 |
| 缺少logout端点 | 新建POST /api/auth/logout |

### 类型问题

| Issue | Resolution |
|-------|------------|
| 多处使用`any`类型 | 替换为具体类型 |
| BaseRepository类型错误 | 添加prismaModel getter |
| Repository使用this.model | 改为this.prismaModel |

### UI问题

| Issue | Resolution |
|-------|------------|
| Tailwind动态类名拼接 | 使用类名映射对象 |
| React直接修改数组 | 使用不可变更新 |
| useEffect依赖缺失 | 添加完整依赖或useRef |

### AI服务问题

| Issue | Resolution |
|-------|------------|
| 流式API使用模拟数据 | 连接真实StreamService |
| getFallbackContent参数不匹配 | 统一参数数量 |

---

## Resources

### 项目文档

| 文档 | 路径 |
|------|------|
| 产品需求文档 | `/PRD.md` |
| 技术栈详解 | `/TECH_STACK.md` |
| 快速上下文 | `/CONTEXT.md` |
| 后端架构 | `/BACKEND_STRUCTURE.md` |
| 前端规范 | `/FRONTEND_GUIDELINES.md` |
| 应用流程 | `/APP_FLOW.md` |
| 实施计划 | `/IMPLEMENTATION_PLAN.md` |
| 项目结构 | `/PROJECT_STRUCTURE.md` |

### 外部资源

| 资源 | URL |
|------|-----|
| 开发者平台 | https://develop.second.me/ |
| 开发文档 | https://develop-docs.second.me/ |
| Skills仓库 | https://github.com/mindverse/Second-Me-Skills |
| Next.js文档 | https://nextjs.org/docs |
| Prisma文档 | https://www.prisma.io/docs |

### OAuth凭证

```
# 前往 https://develop.second.me/ 获取你的凭证
Client ID: your_client_id_here
Client Secret: your_client_secret_here
OAuth授权URL: https://api.second.me/oauth/authorize
Token获取URL: https://api.second.me/oauth/token
用户信息API: https://api.second.me/v1/user
```

---

## Visual/Browser Findings

### 浏览器测试结果

| 测试项 | 桌面全高清 | 笔记本 | 平板 | 手机 |
|--------|-----------|--------|------|------|
| 首页加载 | ✅ | ✅ | ✅ | ✅ |
| 人设选择 | ✅ | ✅ | ✅ | ✅ |
| 流式输出 | ✅ | ✅ | ✅ | ✅ |
| 结果展示 | ✅ | ✅ | ✅ | ✅ |
| 分享卡片 | ✅ | ✅ | ✅ | ✅ |

**成功率**: 100% (功能测试)
**注意**: 控制台有favicon 404警告（需添加public/favicon.ico）

---

## AI人设配置

### 用户人设（5种）

| 人设 | 颜色 | 风格 | 口头禅 |
|------|------|------|--------|
| 毒舌老哥 | 红色 | 犀利、攻击性 | "实话难听"、"扎心了" |
| 阴阳大师 | 紫色 | 反讽、阴阳怪气 | "不会吧不会吧"、"就这？" |
| 数据帝 | 蓝色 | 用数据说话 | "数据表明"、"统计显示" |
| 热梗王 | 黄色 | 网络流行语 | "家人们谁懂啊"、"绝了" |
| 冷面评委 | 灰色 | 冷幽默、一本正经 | "本人建议"、"客观来说" |

### 场控AI（3种）

| AI | 角色 | 风格 |
|----|------|------|
| 热梗王 | 开场引入者 + 气氛活跃 | 网络流行语丰富 |
| 吐槽大师 | 核心吐槽输出者 | 一针见血，善用比喻 |
| 冷面评委 | 收尾总结者 | 陈述句，冷幽默 |

---

## API端点汇总

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | GET | OAuth登录跳转 |
| `/api/auth/callback` | GET | OAuth回调处理 |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/generate` | POST | 批量生成吐槽 |
| `/api/generate/stream` | GET | SSE流式生成 |
| `/api/share` | POST | 创建分享 |
| `/api/share/[id]` | GET | 获取分享内容 |
| `/api/topics` | GET | 话题列表 |

---

*最后更新: 2026-02-10*
