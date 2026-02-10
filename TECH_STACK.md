# AI吐槽大会 - 技术栈文档

> 项目代号: ai-comedy-writers
> 版本: v1.0
> 生成时间: 2026-02-09
> 开发周期: 4天（2月9日-2月12日）

---

## 1. 核心技术栈

### 1.1 前端框架

| 技术 | 版本 | 用途说明 |
|------|------|----------|
| **Next.js** | ^15.0.0 | React全栈框架，App Router模式，支持SSR/SSG |
| **React** | ^19.0.0 | UI库 |
| **TypeScript** | ^5.0.0 | 类型安全 |

**选型理由**:
- Next.js 14/15是官方推荐版本，App Router提供更好的RSC支持
- 原生API Routes，无需额外后端框架
- Vercel部署零配置
- TypeScript保证代码质量，4天快速开发减少bug

### 1.2 样式方案

| 技术 | 版本 | 用途说明 |
|------|------|----------|
| **Tailwind CSS** | ^3.4.0 | 原子化CSS框架 |
| **clsx** | ^2.1.0 | 条件className拼接 |
| **tailwind-merge** | ^2.2.0 | 合并Tailwind类名 |

**选型理由**:
- 开发速度快，无需写CSS文件
- 响应式设计开箱即用
- 深色模式支持方便
- 生产包体积小

### 1.3 认证授权

| 技术 | 版本 | 用途说明 |
|------|------|----------|
| **NextAuth.js** | ^5.0.0-beta | OAuth认证管理 |
| **Second Me OAuth** | - | A2A平台身份认证 |

**选型理由**:
- NextAuth是Next.js生态标准认证方案
- 支持自定义OAuth提供商
- Session管理开箱即用
- v5 beta版本已稳定，提供更好的类型支持

### 1.4 AI调用

| 技术 | 版本 | 用途说明 |
|------|------|----------|
| **OpenAI SDK** | ^4.28.0 | 吐槽内容生成 |
| **Anthropic SDK** | ^0.18.0 | 备选AI服务 |

**选型理由**:
- OpenAI API稳定，响应快
- 官方SDK提供流式输出支持
- 备选Anthropic提高可用性

### 1.5 状态管理

| 技术 | 版本 | 用途说明 |
|------|------|----------|
| **React Hooks** | 内置 | 组件状态管理 |
| **Zustand** | ^4.5.0 | 全局状态（可选） |

**选型理由**:
- 项目规模小，Hooks足够
- 如需跨组件通信，Zustand比Redux轻量

### 1.6 数据存储

| 技术 | 版本 | 用途说明 |
|------|------|----------|
| **LocalStorage** | 浏览器API | 客户端缓存 |
| **Vercel KV** | - | 服务端缓存（可选） |

**选型理由**:
- MVP阶段无需数据库
- LocalStorage存储用户偏好和历史
- Vercel KV免费额度足够小项目

### 1.7 部署运维

| 技术 | 版本 | 用途说明 |
|------|------|----------|
| **Vercel** | - | 托管平台 |
| **GitHub** | - | 代码管理 |

---

## 2. 完整 package.json

```json
{
  "name": "ai-comedy-writers",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-auth": "^5.0.0-beta.19",
    "openai": "^4.28.0",
    "@anthropic-ai/sdk": "^0.18.0",
    "zustand": "^4.5.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.11.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^15.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  },
  "engines": {
    "node": ">=18.17.0",
    "npm": ">=9.0.0"
  }
}
```

---

## 3. 环境变量配置

### 3.1 必需环境变量

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `NEXT_PUBLIC_SECONDME_CLIENT_ID` | string | - | Second Me OAuth客户端ID（公开） |
| `SECONDME_CLIENT_SECRET` | string | - | Second Me OAuth密钥（私密） |
| `NEXTAUTH_URL` | string | `http://localhost:3000` | NextAuth回调URL |
| `NEXTAUTH_SECRET` | string | - | NextAuth加密密钥 |
| `OPENAI_API_KEY` | string | - | OpenAI API密钥 |
| `ANTHROPIC_API_KEY` | string | - | Anthropic API密钥（备选） |

### 3.2 可选环境变量

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `NEXT_PUBLIC_APP_URL` | string | `http://localhost:3000` | 应用公开URL |
| `SECONDME_API_BASE_URL` | string | `https://api.second.me` | Second Me API地址 |
| `NODE_ENV` | string | `development` | 运行环境 |

### 3.3 .env.example

```env
# Second Me OAuth
NEXT_PUBLIC_SECONDME_CLIENT_ID=your-client-id
SECONDME_CLIENT_SECRET=your-client-secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# AI Services
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
SECONDME_API_BASE_URL=https://api.second.me
```

---

## 4. API端点清单

### 4.1 内部API (Next.js API Routes)

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/signin` | GET | NextAuth登录入口 |
| `/api/auth/callback` | GET | OAuth回调处理 |
| `/api/auth/signout` | GET | 登出 |
| `/api/generate` | POST | 批量生成吐槽内容 |
| `/api/stream` | GET | SSE流式生成 |
| `/api/share` | POST | 创建分享卡片 |
| `/api/og/[id]` | GET | 生成分享图片 |

### 4.2 外部API

| 服务 | 端点 | 用途 |
|------|------|------|
| **Second Me OAuth** | `https://api.second.me/oauth/authorize` | OAuth授权 |
| **Second Me Token** | `https://api.second.me/oauth/token` | 获取访问令牌 |
| **Second Me User** | `https://api.second.me/v1/user` | 获取用户信息 |
| **OpenAI Chat** | `https://api.openai.com/v1/chat/completions` | AI内容生成 |

---

## 5. TypeScript类型定义

```typescript
// 用户Second Me Agent信息
interface UserAgent {
  id: string;
  displayName: string;
  bio?: string;
  interests?: string[];
  avatar?: string;
}

// AI人设
interface AIPersona {
  id: string;
  name: string;
  archetype: 'toxic' | 'sarcastic' | 'data' | 'meme' | 'deadpan';
  style: {
    tone: string;
    length: 'short' | 'medium' | 'long';
    emoji: boolean;
    meme: boolean;
  };
  signature: string[];
}

// 吐槽消息
interface RoastMessage {
  role: string;
  content: string;
  mentions?: string[];
  isUser?: boolean;
}

// 吐槽会话
interface RoastSession {
  id: string;
  topic: string;
  userId: string;
  userAgent: UserAgent;
  userPersona: AIPersona;
  round1: RoastMessage[];
  round2: RoastMessage[];
  createdAt: Date;
}

// 分享卡片
interface ShareCard {
  id: string;
  roastId: string;
  imageUrl: string;
  shareUrl: string;
  participants: string[];
  createdAt: Date;
}
```

---

## 6. 技术选型决策记录

### 6.1 为什么选择Next.js而不是Vite/Remix?

| 因素 | Next.js | Vite+React | Remix |
|------|---------|------------|-------|
| API Routes | ✅ 内置 | ❌ 需额外框架 | ✅ 内置 |
| Vercel部署 | ✅ 零配置 | ⚠️ 需配置 | ✅ 支持 |
| 学习曲线 | 🟢 低 | 🟢 低 | 🟡 中 |
| OAuth集成 | ✅ NextAuth | ⚠️ 需自实现 | ✅ 支持 |
| 4天快速开发 | ✅ 推荐 | ❌ 需选后端 | ⚠️ 学习成本 |

**决策**: Next.js是4天快速开发的最优选择。

### 6.2 为什么选择SSE而不是WebSocket?

| 因素 | SSE | WebSocket |
|------|-----|-----------|
| 实现复杂度 | 🟢 简单 | 🟡 中等 |
| 浏览器支持 | ✅ 广泛 | ✅ 广泛 |
| 单向推送 | ✅ 适用 | ❌ 过度设计 |
| 服务器资源 | 🟢 低 | 🟡 中 |

**决策**: SSE足够满足流式输出需求，降低复杂度。

### 6.3 为什么LocalStorage而不是数据库?

| 因素 | LocalStorage | Supabase |
|------|--------------|----------|
| MVP交付速度 | ✅ 零配置 | ⚠️ 需设计Schema |
| 用户量支持 | ⚠️ 单设备 | ✅ 多设备同步 |
| 成本 | ✅ 免费 | ⚠️ 超额度付费 |
| 4天时间 | ✅ 节省时间 | ❌ 设计+迁移时间 |

**决策**: MVP阶段使用LocalStorage，用户量增长后迁移到Supabase。

---

## 7. 代码规范

### 7.1 ESLint配置

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### 7.2 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件 | PascalCase | `RoastCard.tsx` |
| 工具函数 | camelCase | `formatTopic.ts` |
| 常量 | UPPER_SNAKE_CASE | `MAX_ROUNDS` |
| 接口/类型 | PascalCase | `UserAgent` |
| API路由 | kebab-case | `/api/stream` |

---

## 8. 浏览器支持

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## 9. 性能目标

| 指标 | 目标值 |
|------|--------|
| 首屏加载 | <2s |
| 交互响应 | <100ms |
| API响应 | <3s |
| 流式输出首字 | <500ms |

---

## 10. 安全考虑

1. **API密钥保护**: 所有密钥仅服务端使用，NEXT_PUBLIC_前缀仅用于非敏感数据
2. **Session安全**: NextAuth使用httpOnly cookie
3. **CORS配置**: 仅允许信任的域名
4. **Rate Limiting**: API调用频率限制（生产环境）

---

**文档版本**: v1.0
**最后更新**: 2026-02-09
**维护者**: AI吐槽大会开发组
