# AI Comedy Writers

一个基于 Next.js 的多 AI 互动喜剧应用：用户输入话题后，AI 角色会进行多轮吐槽互动，并可生成分享结果。

## 核心功能

- Second Me OAuth 登录与会话管理
- 话题输入与多 AI 生成（批量 + 流式）
- 对战/房间模式（创建、加入、开始、实时流）
- 结果页与分享页
- 可扩展的 AI Provider（OpenAI / Anthropic）

## 技术栈

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth / OAuth
- Zustand

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制并编辑环境变量模板：

```bash
cp .env.example .env
```

至少需要配置：

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `SECOND_ME_CLIENT_ID`
- `SECOND_ME_CLIENT_SECRET`
- `OPENAI_API_KEY`（或你使用的其他 AI Provider）

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. 本地启动

```bash
npm run dev
```

访问 `http://localhost:3000`。

## 常用命令

```bash
npm run dev
npm run type-check
npm run lint
npm run build
```

## 目录说明

- `app/`: 页面与 API 路由（App Router）
- `src/`: 组件、hooks、前端服务层与类型定义
- `lib/`: 服务端业务逻辑、认证、中间件与数据访问
- `prisma/`: 数据模型与迁移相关

## 开源说明

本仓库仅包含项目本体代码与公开运行所需配置示例。

- 不包含本地交接文档、临时文件、比赛过程材料与 AI 协作产物
- 不包含任何真实密钥或私有环境变量

## License

MIT
