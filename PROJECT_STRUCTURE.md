# AI吐槽大会 - 项目结构

## 技术栈

- **框架**: Next.js 15 (App Router)
- **React**: 19.0.0
- **TypeScript**: 5.x
- **样式**: Tailwind CSS 3.4
- **状态管理**: Zustand 5.0
- **认证**: NextAuth.js 5.0 beta
- **数据库**: PostgreSQL + Prisma 5.22
- **AI服务**: OpenAI SDK (主要) + Anthropic (备用)

## 目录结构

```
ai-comedy-writers/
├── app/                          # Next.js App Router (根级)
│   ├── api/                      # API路由
│   │   ├── auth/                 # 认证API
│   │   │   ├── login/route.ts
│   │   │   ├── callback/route.ts
│   │   │   ├── me/route.ts
│   │   │   └── [...nextauth]/route.ts
│   │   ├── generate/             # 生成API
│   │   │   ├── route.ts          # 批量生成
│   │   │   └── stream/route.ts   # SSE流式
│   │   ├── share/                # 分享API
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── topics/route.ts       # 话题API
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
│
├── prisma/                       # 数据库
│   ├── schema.prisma             # 数据模型
│   └── seed.ts                   # 种子数据
│
├── src/                          # 源代码
│   ├── app/                      # 页面组件
│   │   ├── experience/page.tsx   # 体验页(流式观看)
│   │   ├── result/page.tsx       # 结果页
│   │   └── share/[id]/page.tsx   # 分享页
│   │
│   ├── components/               # 组件
│   │   ├── business/             # 业务组件
│   │   │   ├── PersonaSelector.tsx
│   │   │   ├── TopicCard.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ShareCard.tsx
│   │   │   ├── StreamingMessage.tsx
│   │   │   └── index.ts
│   │   ├── layout/               # 布局组件
│   │   └── ui/                   # 基础UI组件
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── spinner.tsx
│   │       └── index.ts
│   │
│   ├── hooks/                    # 自定义Hooks
│   │   ├── useAuth.ts
│   │   ├── useStream.ts
│   │   ├── useLocalStorage.ts
│   │   └── index.ts
│   │
│   ├── lib/                      # 工具库
│   │   ├── api.ts                # API客户端
│   │   ├── auth.ts               # 认证工具
│   │   ├── auth-options.ts       # NextAuth配置
│   │   ├── constants.ts          # 常量定义
│   │   ├── csrf.ts               # CSRF防护
│   │   ├── secondme-api.ts       # Second Me API
│   │   ├── session.ts            # Session管理
│   │   ├── storage.ts            # 存储工具
│   │   ├── stream.ts             # SSE工具
│   │   ├── utils.ts              # 通用工具
│   │   ├── db.ts                 # Prisma客户端
│   │   ├── repositories/         # 数据访问层
│   │   ├── services/             # 业务服务层
│   │   ├── constants/            # 常量目录
│   │   └── validations/          # 数据验证
│   │
│   ├── store/                    # 状态管理
│   │   └── index.ts              # Zustand store
│   │
│   ├── styles/                   # 样式
│   │   └── globals.css           # 全局CSS
│   │
│   └── types/                    # 类型定义
│       └── index.ts
│
├── public/                       # 静态资源
│
├── .env.example                  # 环境变量模板
├── .eslintrc.json                # ESLint配置
├── .gitignore                    # Git忽略
├── next.config.ts                # Next.js配置
├── package.json                  # 依赖配置
├── postcss.config.mjs            # PostCSS配置
├── tailwind.config.ts            # Tailwind配置
├── tsconfig.json                 # TypeScript配置
└── PROJECT_STRUCTURE.md          # 本文档
```

## 数据模型

### User (用户表)
- Second Me OAuth用户信息
- 访问令牌管理
- 用户资料(名称、头像、兴趣)

### Session (会话表)
- 吐槽会话记录
- 用户Agent配置快照
- 两轮对话内容(JSON)

### Topic (话题表)
- 系统预设话题
- 用户自定义话题
- 热度统计

### ShareCard (分享卡表)
- 分享链接生成
- 访问统计
- 过期管理

### TokenRefreshLog (令牌刷新日志)
- Token刷新记录
- 错误追踪

## API端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/auth/login` | OAuth登录跳转 |
| GET | `/api/auth/callback` | OAuth回调 |
| GET | `/api/auth/me` | 获取当前用户 |
| POST | `/api/generate` | 批量生成吐槽 |
| GET | `/api/generate/stream` | SSE流式生成 |
| POST | `/api/share` | 创建分享 |
| GET | `/api/share/[id]` | 获取分享内容 |
| GET | `/api/topics` | 获取话题列表 |

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 类型检查
npm run type-check

# Lint检查
npm run lint

# 数据库迁移
npx prisma migrate dev --name init

# 填充种子数据
npx prisma db seed

# 生成Prisma客户端
npx prisma generate
```

## 环境变量

```env
# Second Me OAuth
SECONDME_CLIENT_ID=
SECONDME_CLIENT_SECRET=
SECONDME_REDIRECT_URI=
SECONDME_AUTH_URL=
SECONDME_TOKEN_URL=
SECONDME_USER_URL=

# 数据库
DATABASE_URL=

# AI服务
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# 应用配置
NEXT_PUBLIC_APP_URL=
```

## 页面路由

| 路径 | 页面 | 描述 |
|------|------|------|
| `/` | 首页 | 人设和话题选择 |
| `/experience` | 体验页 | 流式观看AI吐槽 |
| `/result` | 结果页 | 查看完整结果 |
| `/share/[id]` | 分享页 | 公开的分享卡片 |

## 状态管理

Zustand Store状态:
- `user` - 当前用户
- `selectedPersona` - 选择的AI人设
- `currentSession` - 当前会话
- `isGenerating` - 是否正在生成
- `recentTopics` - 最近话题

## 构建状态

✅ 项目已成功构建
✅ 类型检查通过
✅ 所有API路由已创建
✅ 数据库Schema已定义
✅ 组件库完整

---
最后更新: 2026-02-09
