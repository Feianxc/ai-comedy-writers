# BACKEND_STRUCTURE.md

## AI喜剧作家 - 后端架构文档

---

## 1. 数据库架构

### 1.1 Prisma Schema 完整定义

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== 用户模型 ====================

model User {
  id                String   @id @default(cuid())
  secondmeUserId    String   @unique @map("secondme_user_id")
  accessToken       String   @map("access_token")
  refreshToken      String   @map("refresh_token")
  tokenExpiresAt    DateTime @map("token_expires_at")

  // SecondMe 用户信息（冗余存储，减少API调用）
  displayName       String   @map("display_name")
  bio               String?  @map("bio")
  avatar            String?  @map("avatar")
  interests         String[] @default([])

  // 元数据
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  lastLoginAt       DateTime? @map("last_login_at")

  // 关系
  sessions          Session[]
  shareCards        ShareCard[]
  customTopics      Topic[]  @relation("CustomTopics")

  @@index([secondmeUserId])
  @@map("users")
}

// ==================== 吐槽会话模型 ====================

model Session {
  id              String        @id @default(cuid())
  userId          String        @map("user_id")
  topic           String

  // 用户Agent配置（快照，允许后续修改不影响历史）
  userAgentId     String        @map("user_agent_id")
  userAgentConfig Json          @map("user_agent_config")

  // AI生成结果
  round1          Json          @default("[]") // RoastMessage[]
  round2          Json          @default("[]") // RoastMessage[]
  participants    String[]      @default([])   // 提及的用户ID列表

  // 元数据
  isPublic        Boolean       @default(false) @map("is_public")
  createdAt       DateTime      @default(now()) @map("created_at")

  // 关系
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  shareCards      ShareCard[]

  @@index([userId])
  @@index([createdAt])
  @@index([isPublic])
  @@map("sessions")
}

// ==================== 话题模型 ====================

model Topic {
  id              String        @id @default(cuid())
  title           String
  category        String
  hot             Int           @default(0)

  // 系统话题 vs 用户自定义
  isSystem        Boolean       @default(true) @map("is_system")
  createdBy       String?       @map("created_by")

  // 元数据
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  // 关系
  creator         User?         @relation("CustomTopics", fields: [createdBy], references: [id], onDelete: SetNull)

  @@index([category])
  @@index([hot(sort: Desc)])
  @@index([isSystem])
  @@map("topics")
}

// ==================== 分享卡片模型 ====================

model ShareCard {
  id              String        @id @default(cuid())
  sessionId       String        @map("session_id")
  userId          String        @map("user_id")

  // 卡片资源
  imageUrl        String        @map("image_url")
  shareUrl        String        @unique @map("share_url")
  shortCode       String        @unique @map("short_code") // 6位短码

  // 访问统计
  viewCount       Int           @default(0) @map("view_count")

  // 元数据
  expiresAt       DateTime?     @map("expires_at")
  createdAt       DateTime      @default(now()) @map("created_at")

  // 关系
  session         Session       @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([shortCode])
  @@index([userId])
  @@map("share_cards")
}

// ==================== Token刷新日志（可选） ====================

model TokenRefreshLog {
  id              String        @id @default(cuid())
  userId          String        @map("user_id")
  success         Boolean
  errorMessage    String?       @map("error_message")
  createdAt       DateTime      @default(now()) @map("created_at")

  @@index([userId])
  @@map("token_refresh_logs")
}
```

### 1.2 数据库关系图

```
User (1) ──< (N) Session
User (1) ──< (N) ShareCard
User (1) ──< (N) Topic (自定义话题)
Session (1) ──< (N) ShareCard
```

### 1.3 索引策略

| 表 | 索引 | 用途 |
|---|---|---|
| users | secondme_user_id | OAuth登录查询 |
| sessions | user_id, created_at | 用户会话列表 |
| sessions | is_public | 公开会话浏览 |
| topics | hot DESC | 热门话题排序 |
| share_cards | short_code | 分享卡快速查询 |

---

## 2. 认证逻辑

### 2.1 OAuth2 完整流程

```mermaid
sequenceDiagram
    User->>Frontend: 点击登录
    Frontend->>Backend: GET /api/auth/login
    Backend->>SecondMe: 302 Redirect to /oauth/authorize
    SecondMe->>User: 授权页面
    User->>SecondMe: 同意授权
    SecondMe->>Backend: GET /api/auth/callback?code=xxx
    Backend->>SecondMe: POST /oauth/token (交换code)
    SecondMe->>Backend: { access_token, refresh_token }
    Backend->>SecondMe: GET /v1/user (获取用户信息)
    SecondMe->>Backend: { id, display_name, bio, avatar, interests }
    Backend->>Database: 创建/更新用户记录
    Backend->>Frontend: Set Cookie + Redirect
```

### 2.2 State 参数验证

```typescript
// 生成 state: base64(JSON.stringify({ random, timestamp, redirect }))
// 验证: 解码 → 检查timestamp不超过5分钟 → 校验random存在Redis
```

### 2.3 Token 存储策略

| Token | 存储位置 | 有效期 | 刷新策略 |
|-------|---------|--------|---------|
| Access Token | 数据库 users.access_token | 2小时 | 过期前5分钟自动刷新 |
| Refresh Token | 数据库 users.refresh_token | 30天 | 用刷新 token 获取新的 access token |
| Session Cookie | HttpOnly, Secure, SameSite=Lax | 7天 | 每次请求自动延期 |

### 2.4 安全措施

1. **CSRF 防护**: State 参数 + SameSite Cookie
2. **Token 刷新**: 后台定时任务，每30分钟检查一次
3. **CORS 配置**: 仅允许 `https://ai-comedy.second.me` 和 `localhost`
4. **速率限制**: OAuth 登录每IP每小时最多10次
5. **PKCE**: 推荐（如前端支持）

---

## 3. API 端点契约

### 3.1 通用响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  code: 0;
  data: T;
}

// 错误响应
interface ErrorResponse {
  code: number;  // 非0表示错误
  error: string;
  message: string;
}
```

### 3.2 认证相关 API

#### API 3.2.1: OAuth 登录跳转

```
POST /api/auth/login
```

**请求体**:
```json
{
  "redirectUrl": "/dashboard"  // 可选，登录后跳转地址
}
```

**响应**: `302 Redirect` 到 SecondMe 授权页面

**错误响应**:
```json
{
  "code": 4001,
  "error": "INVALID_REDIRECT",
  "message": "不合法的跳转地址"
}
```

---

#### API 3.2.2: OAuth 回调

```
GET /api/auth/callback?code={code}&state={state}
```

**Query 参数**:
- `code`: SecondMe 授权码
- `state`: CSRF 防护参数

**响应**: `302 Redirect` 到前端，携带 session cookie

**错误场景**:
- code 过期: 重定向到 `/login?error=expired`
- state 不匹配: 重定向到 `/login?error=invalid_state`
- 用户拒绝: 重定向到 `/login?error=denied`

---

#### API 3.2.3: 登出

```
POST /api/auth/logout
```

**响应**:
```json
{
  "code": 0,
  "data": { "success": true }
}
```

**行为**: 清除 session cookie

---

#### API 3.2.4: 获取当前用户

```
GET /api/auth/me
```

**请求头**:
```
Cookie: session=xxx
```

**成功响应**:
```json
{
  "code": 0,
  "data": {
    "id": "clxabc123",
    "secondmeUserId": "sm_123456",
    "displayName": "喜剧之王",
    "bio": "AI 喜剧生成器",
    "avatar": "https://cdn.second.me/avatars/123.jpg",
    "interests": ["科技", "AI", "喜剧"],
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**未登录响应**:
```json
{
  "code": 4011,
  "error": "UNAUTHORIZED",
  "message": "请先登录"
}
```

---

### 3.3 吐槽生成 API

#### API 3.3.1: 批量生成吐槽

```
POST /api/generate
```

**请求头**:
```
Cookie: session=xxx
Content-Type: application/json
```

**请求体**:
```json
{
  "topic": "为什么程序员总是喜欢熬夜",
  "userAgent": {
    "displayName": "夜班猫头鹰",
    "bio": "凌晨三点写代码，早上十点睡大觉",
    "interests": ["编程", "咖啡", "熬夜"],
    "avatar": "https://example.com/avatar.jpg"
  }
}
```

**成功响应**:
```json
{
  "code": 0,
  "data": {
    "id": "clxsession456",
    "topic": "为什么程序员总是喜欢熬夜",
    "round1": [
      {
        "role": "user_agent",
        "content": "夜班猫头鹰：凌晨三点的代码和早上的代码有什么区别？晚上的代码有灵魂，早上的代码只有bug。",
        "isUser": false
      },
      {
        "role": "ai_comedian",
        "content": "AI喜剧家：说得好像早上你有灵魂似的... 你早上那不叫写代码，叫梦游键盘法。",
        "isUser": false
      }
    ],
    "round2": [
      {
        "role": "user_agent",
        "content": "夜班猫头鹰：咖啡是程序员的血液，只不过我的血型是美式，浓度三倍。",
        "isUser": false
      },
      {
        "role": "ai_comedian",
        "content": "AI喜剧家：三倍美式？兄弟你不是在写代码，你是在通过咖啡因试图实现时间旅行，直接跳到明天早上的deadline。",
        "isUser": false
      }
    ],
    "participants": ["@夜班猫头鹰", "@AI喜剧家"],
    "createdAt": "2025-01-15T14:30:00Z"
  }
}
```

**错误响应**:
```json
{
  "code": 5001,
  "error": "AI_GENERATION_FAILED",
  "message": "AI 生成失败，请稍后重试"
}
```

---

#### API 3.3.2: 流式生成吐槽 (SSE)

```
GET /api/stream?topic={encoded}&agent={encoded}
```

**Query 参数**:
- `topic`: URL 编码的话题
- `agent`: URL 编码的 userAgent JSON

**请求头**:
```
Cookie: session=xxx
Accept: text/event-stream
```

**SSE 事件流**:
```
event: open
data: {"sessionId": "clxsession789"}

event: round1.agent
data: {"content": "夜班猫头鹰：凌晨三点..."}

event: round1.ai
data: {"content": "AI喜剧家：说得好像..."}

event: round2.agent
data: {"content": "夜班猫头鹰：咖啡是..."}

event: round2.ai
data: {"content": "AI喜剧家：三倍美式？..."}

event: done
data: {"sessionId": "clxsession789", "participants": ["@夜班猫头鹰", "@AI喜剧家"]}
```

**错误事件**:
```
event: error
data: {"code": 5001, "error": "AI_GENERATION_FAILED"}
```

---

### 3.4 话题 API

#### API 3.4.1: 获取话题列表

```
GET /api/topics?category={category}&limit={limit}
```

**Query 参数**:
- `category`: 可选，话题分类（如 "职场", "生活", "科技"）
- `limit`: 可选，默认 20，最大 50

**成功响应**:
```json
{
  "code": 0,
  "data": {
    "topics": [
      {
        "id": "clxtopic001",
        "title": "为什么周一总是这么痛苦",
        "category": "职场",
        "hot": 1250,
        "isSystem": true
      },
      {
        "id": "clxtopic002",
        "title": "当代年轻人的消费观",
        "category": "生活",
        "hot": 980,
        "isSystem": true
      }
    ]
  }
}
```

---

#### API 3.4.2: 创建自定义话题

```
POST /api/topics
```

**请求头**:
```
Cookie: session=xxx
```

**请求体**:
```json
{
  "title": "为什么AI生成的笑话这么好笑",
  "category": "科技"
}
```

**成功响应**:
```json
{
  "code": 0,
  "data": {
    "id": "clxtopic123",
    "title": "为什么AI生成的笑话这么好笑",
    "category": "科技",
    "hot": 0,
    "isSystem": false,
    "createdBy": "clxuser456"
  }
}
```

**错误响应**:
```json
{
  "code": 4002,
  "error": "INVALID_TOPIC",
  "message": "话题标题长度必须在5-50字之间"
}
```

---

### 3.5 分享 API

#### API 3.5.1: 生成分享卡片

```
POST /api/share
```

**请求头**:
```
Cookie: session=xxx
```

**请求体**:
```json
{
  "sessionId": "clxsession456"
}
```

**成功响应**:
```json
{
  "code": 0,
  "data": {
    "id": "clxshare789",
    "shareUrl": "https://ai-comedy.second.me/s/Xy9aB2",
    "shortCode": "Xy9aB2",
    "imageUrl": "https://cdn.ai-comedy.second.me/cards/Xy9aB2.png",
    "expiresAt": "2025-02-15T00:00:00Z"
  }
}
```

---

#### API 3.5.2: 获取分享内容

```
GET /api/share/{shortCode}
```

**路径参数**:
- `shortCode`: 6位短码

**成功响应**:
```json
{
  "code": 0,
  "data": {
    "id": "clxshare789",
    "shortCode": "Xy9aB2",
    "session": {
      "id": "clxsession456",
      "topic": "为什么程序员总是喜欢熬夜",
      "round1": [...],
      "round2": [...],
      "participants": ["@夜班猫头鹰", "@AI喜剧家"],
      "createdAt": "2025-01-15T14:30:00Z"
    },
    "creator": {
      "displayName": "分享者昵称",
      "avatar": "https://..."
    },
    "viewCount": 42
  }
}
```

**错误响应**:
```json
{
  "code": 4041,
  "error": "SHARE_NOT_FOUND",
  "message": "分享内容不存在或已过期"
}
```

---

## 4. 外部 API 集成

### 4.1 SecondMe API

#### 基础配置
```typescript
const SECONDS_ME_CONFIG = {
  baseUrl: 'https://api.second.me',
  oauth: {
    clientId: process.env.SECOND_ME_CLIENT_ID,
    clientSecret: process.env.SECOND_ME_CLIENT_SECRET,
    authorizeUrl: 'https://api.second.me/oauth/authorize',
    tokenUrl: 'https://api.second.me/oauth/token',
  },
  api: {
    userUrl: 'https://api.second.me/v1/user',
  }
} as const;
```

#### OAuth Token 交换
```typescript
interface SecondMeTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;  // 秒，通常 7200
  token_type: 'Bearer';
}

interface SecondMeUserResponse {
  id: string;
  display_name: string;
  bio?: string;
  avatar?: string;
  interests?: string[];
}
```

#### 错误处理
| HTTP状态 | SecondMe错误 | 处理方式 |
|---------|-------------|---------|
| 400 | invalid_grant | 授权码过期，重定向登录 |
| 401 | invalid_client | Client凭证错误，告警 |
| 429 | rate_limit | 延迟重试 |

---

### 4.2 AI API (OpenAI/Anthropic)

#### 推荐配置
```typescript
const AI_CONFIG = {
  provider: 'openai',  // 或 'anthropic'
  model: 'gpt-4o-mini',  // 性价比高
  timeout: 30000,  // 30秒
  maxRetries: 2,
} as const;
```

#### 调用示例 (OpenAI)
```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '你是一个幽默的喜剧作家，擅长吐槽...'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.9,
    max_tokens: 500,
  }),
  timeout: 30000,
});
```

#### 降级策略
1. **OpenAI 失败** → 切换到 Anthropic Claude
2. **Anthropic 失败** → 返回预设的"系统维护中"模板
3. **超时** → 15秒后中断，返回降级响应

---

## 5. 服务层架构

### 5.1 目录结构

```
src/
├── app/
│   └── api/                    # API 路由 (App Router)
│       ├── auth/
│       │   ├── login/
│       │   │   └── route.ts
│       │   ├── callback/
│       │   │   └── route.ts
│       │   ├── logout/
│       │   │   └── route.ts
│       │   └── me/
│       │       └── route.ts
│       ├── generate/
│       │   └── route.ts
│       ├── stream/
│       │   └── route.ts
│       ├── topics/
│       │   ├── route.ts
│       │   └── [id]/
│       │       └── route.ts
│       └── share/
│           ├── route.ts
│           └── [shortCode]/
│               └── route.ts
│
├── lib/
│   ├── db.ts                   # Prisma 客户端单例
│   ├── auth.ts                 # Session 管理
│   ├── csrf.ts                 # State 参数生成/验证
│   ├── cache.ts                # Redis/内存缓存
│   └── rate-limit.ts           # 速率限制
│
├── services/
│   ├── AuthService.ts          # OAuth 流程 + Token 刷新
│   ├── AIService.ts            # AI 生成逻辑
│   ├── StreamService.ts        # SSE 流管理
│   ├── ShareService.ts         # 分享卡生成
│   └── TopicService.ts         # 话题管理
│
├── types/
│   ├── api.ts                  # API 请求/响应类型
│   ├── models.ts               # 数据模型类型
│   └── errors.ts               # 错误代码定义
│
└── middleware/
    ├── auth.ts                 # 认证中间件
    ├── error.ts                # 错误处理中间件
    └── cors.ts                 # CORS 配置
```

### 5.2 服务模块定义

#### AuthService
```typescript
class AuthService {
  // 生成 OAuth 登录 URL
  getLoginUrl(redirectUrl?: string): string

  // 处理 OAuth 回调，返回用户
  handleCallback(code: string, state: string): Promise<User>

  // 刷新 access token
  refreshAccessToken(user: User): Promise<void>

  // 验证 session cookie
  validateSession(cookie: string): Promise<User | null>

  // 登出
  logout(sessionId: string): Promise<void>
}
```

#### AIService
```typescript
class AIService {
  // 生成完整的吐槽（两轮）
  generateRoast(topic: string, userAgent: UserAgent): Promise<RoastSession>

  // 生成单条吐槽消息
  generateMessage(topic: string, context: RoastMessage[], role: string): Promise<string>

  // 检查服务可用性
  healthCheck(): Promise<boolean>
}
```

#### StreamService
```typescript
class StreamService {
  // 创建 SSE 流
  createStream(req: NextRequest): ReadableStream

  // 发送事件
  sendEvent(stream: ReadableStream, event: string, data: unknown): void

  // 关闭流
  closeStream(stream: ReadableStream): void
}
```

#### ShareService
```typescript
class ShareService {
  // 生成分享卡片
  createShareCard(sessionId: string, userId: string): Promise<ShareCard>

  // 生成短码
  generateShortCode(): string  // 6位，Base62编码

  // 渲染卡片图片（可使用 HTML-to-Image 或 Canvas）
  renderCardImage(session: Session): Promise<Buffer>

  // 获取分享内容
  getShareContent(shortCode: string): Promise<ShareContent>

  // 增加浏览计数
  incrementViewCount(shortCode: string): Promise<void>
}
```

#### TopicService
```typescript
class TopicService {
  // 获取话题列表
  getTopics(category?: string, limit?: number): Promise<Topic[]>

  // 创建自定义话题
  createCustomTopic(title: string, category: string, userId: string): Promise<Topic>

  // 获取热门话题
  getHotTopics(limit?: number): Promise<Topic[]>

  // 更新热度
  incrementHot(topicId: string): Promise<void>
}
```

---

## 6. TypeScript 类型定义

### 6.1 核心 API 类型

```typescript
// src/types/api.ts

export interface UserAgent {
  displayName: string;
  bio?: string;
  interests?: string[];
  avatar?: string;
}

export interface RoastMessage {
  role: 'user_agent' | 'ai_comedian';
  content: string;
  mentions?: string[];
  isUser: boolean;
}

export interface RoastSession {
  id: string;
  topic: string;
  userId: string;
  userAgent: UserAgent;
  round1: RoastMessage[];
  round2: RoastMessage[];
  participants: string[];
  createdAt: Date;
}

export interface Topic {
  id: string;
  title: string;
  category: string;
  hot: number;
  isSystem: boolean;
  createdBy?: string;
}

export interface ShareCard {
  id: string;
  sessionId: string;
  userId: string;
  imageUrl: string;
  shareUrl: string;
  shortCode: string;
  viewCount: number;
  expiresAt?: Date;
  createdAt: Date;
}
```

### 6.2 错误代码

```typescript
// src/types/errors.ts

export enum ErrorCode {
  // 认证错误 4xxx
  UNAUTHORIZED = 4011,
  INVALID_TOKEN = 4012,
  TOKEN_EXPIRED = 4013,
  INVALID_STATE = 4014,
  OAUTH_FAILED = 4015,

  // 客户端错误 4xxx
  INVALID_REQUEST = 4001,
  INVALID_REDIRECT = 4002,
  INVALID_TOPIC = 4003,
  SHARE_NOT_FOUND = 4041,

  // 服务端错误 5xxx
  AI_GENERATION_FAILED = 5001,
  DATABASE_ERROR = 5002,
  EXTERNAL_API_ERROR = 5003,
  INTERNAL_ERROR = 5004,
}

export function errorResponse(code: ErrorCode, message?: string): ErrorResponse {
  const errorMap: Record<ErrorCode, string> = {
    [ErrorCode.UNAUTHORIZED]: '未授权',
    [ErrorCode.INVALID_TOKEN]: '无效的令牌',
    [ErrorCode.TOKEN_EXPIRED]: '令牌已过期',
    [ErrorCode.INVALID_STATE]: '无效的状态参数',
    [ErrorCode.OAUTH_FAILED]: 'OAuth认证失败',
    [ErrorCode.INVALID_REQUEST]: '无效的请求',
    [ErrorCode.INVALID_REDIRECT]: '不合法的跳转地址',
    [ErrorCode.INVALID_TOPIC]: '话题格式不正确',
    [ErrorCode.SHARE_NOT_FOUND]: '分享内容不存在',
    [ErrorCode.AI_GENERATION_FAILED]: 'AI生成失败',
    [ErrorCode.DATABASE_ERROR]: '数据库错误',
    [ErrorCode.EXTERNAL_API_ERROR]: '外部API错误',
    [ErrorCode.INTERNAL_ERROR]: '内部错误',
  };

  return {
    code,
    error: Object.keys(ErrorCode).find(key => ErrorCode[key as keyof typeof ErrorCode] === code) || 'UNKNOWN',
    message: message || errorMap[code] || '未知错误',
  };
}
```

---

## 7. 环境变量

```bash
# .env.example

# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/ai_comedy_writers"

# SecondMe OAuth (前往 https://develop.second.me/ 获取)
SECOND_ME_CLIENT_ID="your_client_id_here"
SECOND_ME_CLIENT_SECRET="your_client_secret_here"
SECOND_ME_REDIRECT_URI="http://localhost:3000/api/auth/callback"

# AI API
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Session
SESSION_SECRET="your-random-secret-key-min-32-chars"

# Redis (可选，用于缓存和速率限制)
REDIS_URL="redis://localhost:6379"

# CDN (分享卡片存储)
CDN_BASE_URL="https://cdn.ai-comedy.second.me"

# 前端域名（CORS）
FRONTEND_URL="https://ai-comedy.second.me"
```

---

## 8. 开发优先级 (4天冲刺)

### Day 1: 基础框架
- [ ] Prisma Schema 设置 + 数据库迁移
- [ ] 项目脚手架 (Next.js + TypeScript)
- [ ] OAuth 登录流程
- [ ] 基础 API 路由结构

### Day 2: 核心功能
- [ ] AI 集成（批量生成）
- [ ] `/api/generate` 端点
- [ ] 话题管理 CRUD

### Day 3: 高级功能
- [ ] SSE 流式生成
- [ ] 分享卡生成
- [ ] Token 刷新机制

### Day 4: 收尾
- [ ] 错误处理完善
- [ ] 单元测试（核心流程）
- [ ] 部署准备

---

## 9. 附录

### 9.1 短码生成算法
```typescript
function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;  // 约 560亿种组合，碰撞概率极低
}
```

### 9.2 SSE 流示例
```typescript
// Next.js App Router SSE 示例
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send('open', { sessionId: 'xxx' });
        // ... 生成逻辑
        send('done', { sessionId: 'xxx' });
      } catch (error) {
        send('error', { code: 5001, error: 'AI_GENERATION_FAILED' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

**文档版本**: 1.0
**最后更新**: 2025-02-09
**作者**: AI Comedy Writers Team
