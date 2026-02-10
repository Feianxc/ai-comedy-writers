# AI喜剧作家 - 前端设计规范

> 版本：v1.0
> 更新日期：2026-02-09
> 设计理念：亮色主题、简约优雅、现代感、娱乐属性

---

## 1. 设计系统

### 1.1 字体系统

#### 字体族
```css
/* 中文字体栈 */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
             "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", sans-serif;

/* 等宽字体（代码/数据） */
font-family: "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", monospace;
```

#### 字号等级

| 用途 | 字号 | Tailwind | 行高 | 使用场景 |
|------|------|----------|------|----------|
| 大标题 | 28px | `text-3xl` | 1.2 | 首页主标题 |
| 标题 | 24px | `text-2xl` | 1.3 | 页面标题 |
| 副标题 | 20px | `text-xl` | 1.4 | 区块标题 |
| 正文大 | 18px | `text-lg` | 1.5 | 重要正文 |
| 正文 | 16px | `text-base` | 1.6 | 常规正文 |
| 正文小 | 14px | `text-sm` | 1.6 | 辅助说明 |
| 标签 | 12px | `text-xs` | 1.5 | 标签/徽章 |

#### 字重规范

| 等级 | 数值 | Tailwind | 使用场景 |
|------|------|----------|----------|
| 常规 | 400 | `font-normal` | 正文 |
| 中等 | 500 | `font-medium` | 强调正文 |
| 半粗 | 600 | `font-semibold` | 小标题 |
| 粗体 | 700 | `font-bold` | 标题 |

---

### 1.2 配色系统

#### 主色调（品牌色）

```css
/* 品牌主色 - 活力橙（娱乐感、轻松） */
--primary-50:  #fff7ed;
--primary-100: #ffedd5;
--primary-200: #fed7aa;
--primary-300: #fdba74;
--primary-400: #fb923c;
--primary-500: #f97316;  /* 主色 */
--primary-600: #ea580c;
--primary-700: #c2410c;
--primary-800: #9a3412;
--primary-900: #7c2d12;

/* Tailwind: orange-500 */
```

#### 辅助色

```css
/* 辅助色 - 蓝紫色（科技感、AI） */
--secondary-50:  #f5f3ff;
--secondary-100: #ede9fe;
--secondary-200: #ddd6fe;
--secondary-300: #c4b5fd;
--secondary-400: #a78bfa;
--secondary-500: #8b5cf6;  /* 辅助主色 */
--secondary-600: #7c3aed;
--secondary-700: #6d28d9;
--secondary-800: #5b21b6;
--secondary-900: #4c1d95;

/* Tailwind: violet-500 */
```

#### 中性色（灰度）

```css
/* 亮色主题灰度 */
--gray-50:  #fafafa;  /* 背景色 */
--gray-100: #f4f4f5;  /* 卡片背景 */
--gray-200: #e4e4e7;  /* 边框 */
--gray-300: #d4d4d8;  /* 分割线 */
--gray-400: #a1a1aa;  /* 禁用文字 */
--gray-500: #71717a;  /* 辅助文字 */
--gray-600: #52525b;  /* 常规文字 */
--gray-700: #3f3f46;  /* 深色文字 */
--gray-800: #27272a;  /* 标题文字 */
--gray-900: #18181b;  /* 最深文字 */
```

#### 功能色

```css
/* 成功 - 绿色 */
--success-50:  #f0fdf4;
--success-500: #22c55e;
--success-600: #16a34a;

/* 警告 - 黄色 */
--warning-50:  #fefce8;
--warning-500: #eab308;
--warning-600: #ca8a04;

/* 错误 - 红色 */
--error-50:   #fef2f2;
--error-500:  #ef4444;
--error-600:  #dc2626;

/* 信息 - 蓝色 */
--info-50:    #eff6ff;
--info-500:   #3b82f6;
--info-600:   #2563eb;
```

#### AI人设专属颜色

**用户人设（5个）**

| 人设 | 颜色 | Hex | Tailwind | 气质 |
|------|------|-----|----------|------|
| 毒舌老哥 | 火焰红 | `#ef4444` | `red-500` | 犀利、攻击性 |
| 阴阳大师 | 紫罗兰 | `#a855f7` | `purple-500` | 反讽、阴阳 |
| 数据帝 | 科技蓝 | `#0ea5e9` | `sky-500` | 理性、数据 |
| 热梗王 | 活力黄 | `#eab308` | `yellow-500` | 活泼、梗 |
| 冷面评委 | 商务灰 | `#64748b` | `slate-500` | 冷静、严肃 |

**场控AI（3个）**

| AI | 颜色 | Hex | Tailwind | 角色 |
|----|------|-----|----------|------|
| 热梗王（场控） | 金橙色 | `#f59e0b` | `amber-500` | 开场、气氛 |
| 吐槽大师 | 品牌橙 | `#f97316` | `orange-500` | 核心输出 |
| 冷面评委（场控） | 深岩灰 | `#475569` | `slate-600` | 收尾总结 |

---

### 1.3 间距系统

#### 基础间距单位

```css
/* 基于 4px 网格 */
--spacing-1:  4px;   /* nano */
--spacing-2:  8px;   /* xs */
--spacing-3:  12px;  /* sm */
--spacing-4:  16px;  /* md - 基础单位 */
--spacing-5:  20px;
--spacing-6:  24px;  /* lg */
--spacing-8:  32px;  /* xl */
--spacing-10: 40px;
--spacing-12: 48px;  /* 2xl */
--spacing-16: 64px;  /* 3xl */
--spacing-20: 80px;  /* 4xl */
```

#### 间距使用规范

| 场景 | 间距 | Tailwind |
|------|------|----------|
| 组件内横向间距 | 12px | `px-3` |
| 组件内纵向间距 | 8px | `py-2` |
| 组件间间距 | 16px | `gap-4` |
| 区块间间距 | 32px | `gap-8` |
| 页面边距（移动端） | 16px | `p-4` |
| 页面边距（桌面） | 24px | `p-6` |

---

### 1.4 布局规则

#### 容器宽度

```css
/* 最大内容宽度 */
--container-sm:  640px;  /* 移动端全宽 */
--container-md:  768px;  /* 平板 */
--container-lg:  1024px; /* 桌面 */
--container-xl:  1280px; /* 大屏 */

/* 实际使用 */
.container { max-width: 640px; margin: 0 auto; }  /* 移动优先 */
```

#### 响应式断点

```css
/* Tailwind 默认断点 */
sm:   640px   /* 小屏平板 */
md:   768px   /* 平板 */
lg:   1024px  /* 桌面 */
xl:   1280px  /* 大屏 */
2xl:  1536px  /* 超大屏 */
```

#### Flex布局规范

```css
/* 常用布局模式 */
.flex-center   { display: flex; justify-content: center; align-items: center; }
.flex-between  { display: flex; justify-content: space-between; align-items: center; }
.flex-col-center { display: flex; flex-direction: column; align-items: center; }
```

---

## 2. 组件规范

### 2.1 基础组件

#### 按钮

**主按钮**
```tsx
// Tailwind classes
"bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-full transition-colors active:scale-95"
```

**次要按钮**
```tsx
"bg-white border-2 border-gray-200 hover:border-orange-300 text-gray-700 font-medium py-3 px-6 rounded-full transition-colors"
```

**文字按钮**
```tsx
"text-orange-500 hover:text-orange-600 font-medium py-2 transition-colors"
```

**按钮尺寸**

| 尺寸 | 高度 | 圆角 | 字号 |
|------|------|------|------|
| sm | 32px | rounded-full | text-sm |
| md | 44px | rounded-full | text-base |
| lg | 52px | rounded-full | text-lg |

---

#### 输入框

```tsx
// 标准输入框
"w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all bg-white text-gray-800 placeholder:text-gray-400"

// 状态变体
// 错误: border-red-400 focus:ring-red-100
// 禁用: bg-gray-50 text-gray-400 cursor-not-allowed
```

---

#### 卡片

```tsx
// 标准卡片
"bg-white rounded-3xl shadow-sm border border-gray-100 p-6"

// 悬浮效果
"hover:shadow-md hover:border-gray-200 transition-all"

// 点击反馈
"active:scale-[0.98] transition-transform"
```

---

#### 标签/徽章

```tsx
// 实心标签
"px-3 py-1 rounded-full text-xs font-medium"

// 颜色变体
// 人设标签: bg-[人设色] text-white
// 灰色标签: bg-gray-100 text-gray-600
// 边框标签: border border-gray-200 text-gray-600
```

---

#### 头像

```tsx
// 尺寸规格
// xs: 24px (w-6 h-6)
// sm: 32px (w-8 h-8)
// md: 40px (w-10 h-10)
// lg: 48px (w-12 h-12)
// xl: 64px (w-16 h-16)

// 样式
"rounded-full object-cover bg-gray-100 border-2 border-white shadow-sm"

// AI头像（带边框颜色）
"rounded-full bg-gradient-to-br from-[人设色]-400 to-[人设色]-600 flex items-center justify-center text-white font-bold"
```

---

#### 加载状态

```tsx
// 骨架屏
"animate-pulse bg-gray-200 rounded"

// 加载指示器
// 简单旋转圆点
"w-5 h-5 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"

// 打字指示器（消息气泡）
"flex gap-1 items-center"
// 三个小点: "w-2 h-2 bg-gray-400 rounded-full animate-bounce" (延迟 0ms, 150ms, 300ms)
```

---

### 2.2 业务组件

#### 登录按钮（微信公众号）

```tsx
// 固定底部悬浮
"fixed bottom-6 left-6 right-6 bg-green-500 hover:bg-green-600 text-white font-medium py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-colors"

// 最大宽度限制（桌面）
"max-w-md left-1/2 -translate-x-1/2"
```

---

#### AI人设选择器

```tsx
// 横向滚动卡片列表
"flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"

// 单个人设卡片
"w-24 flex-shrink-0 snap-center cursor-pointer transition-all"
// 选中状态: "ring-2 ring-orange-400 ring-offset-2"

// 卡片内容
"flex flex-col items-center gap-2"
// 头像 + 名称
```

---

#### 话题卡片

```tsx
// 卡片容器
"bg-white rounded-3xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-orange-200 active:scale-[0.98] transition-all"

// 话题内容
"flex gap-4"
// 左侧: 序号圆圈
// 右侧: 标题 + 参与人数

// 热门标签
"absolute top-4 right-4 px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-medium"
```

---

#### 吐槽消息气泡

**用户消息**
```tsx
// 容器
"flex justify-end mb-4"

// 气泡
"max-w-[80%] bg-orange-500 text-white px-4 py-3 rounded-2xl rounded-br-md"
```

**AI消息**
```tsx
// 容器
"flex gap-3 mb-4"

// 头像 + 消息区
// 头像: 40px 圆形，带人设色
// 气泡: "flex-1 bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md"

// 人设标签（气泡内）
"text-[10px] text-gray-400 mb-1"
```

---

#### 流式消息容器

```tsx
// 容器
"fixed inset-0 bg-white flex flex-col"

// 顶部栏
"flex-shrink-0 px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white"

// 消息区（可滚动）
"flex-1 overflow-y-auto px-4 py-6 space-y-4"

// 底部输入区（可选）
"flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white"
```

---

#### 分享卡片

```tsx
// 卡片容器（固定比例）
"aspect-[4/5] bg-gradient-to-br from-orange-50 to-violet-50 rounded-3xl p-6 relative overflow-hidden"

// 装饰元素
// 背景圆点、渐变光晕

// 内容区
"flex flex-col h-full justify-between"

// 顶部: 人设信息
// 中间: 吐槽内容（滚动或截断）
// 底部: 品牌 + 二维码
```

---

## 3. 动画规范

### 3.1 过渡参数

```css
/* 标准过渡 */
--transition-fast:   150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base:   200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow:   300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Tailwind 映射 */
// fast:   duration-150 ease-out
// base:   duration-200 ease-out
// slow:   duration-300 ease-out
```

### 3.2 标准动画

```css
/* 淡入 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 上浮淡入 */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 消息气泡出现 */
@keyframes messageIn {
  from { opacity: 0; transform: translateY(10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Tailwind 使用 */
// animate-[fadeIn_200ms_ease-out]
// animate-[fadeSlideUp_300ms_ease-out]
```

### 3.3 加载动画

```css
/* 旋转加载 */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 脉冲骨架屏 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 打字点跳动 */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
```

### 3.4 动画使用原则

1. **优先简单过渡**：hover、focus 状态使用 transition
2. **避免复杂关键帧**：仅必要时使用自定义动画
3. **尊重用户偏好**：检查 `prefers-reduced-motion`
4. **保持性能**：使用 transform 和 opacity，避免布局属性

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 4. 响应式设计

### 4.1 断点策略

```css
/* 移动优先设计 */
/* 默认样式 → 320px-640px */
/* sm: 640px+ 小屏平板 */
/* md: 768px+ 平板 */
/* lg: 1024px+ 桌面 */
```

### 4.2 布局适配

**首页**
```tsx
// 移动端: 单列，卡片全宽
// 桌面: 居中容器，最大 640px

<div className="container max-w-md mx-auto px-4">
```

**体验页/结果页**
```tsx
// 移动端: 全屏消息流
// 桌面: 居中容器，最大 640px，两侧留白

<div className="min-h-screen bg-gray-50 flex justify-center">
  <div className="w-full max-w-md bg-white min-h-screen shadow-xl">
```

**分享页**
```tsx
// 移动端: 全屏卡片
// 桌面: 居中展示，背景装饰

<div className="min-h-screen bg-gradient-to-br from-orange-100 to-violet-100 flex items-center justify-center p-8">
  <div className="w-full max-w-md aspect-[4/5]">
```

### 4.3 触摸目标

```css
/* 最小触摸区域: 44px × 44px */
/* 可点击元素间距: 至少 8px */

button, a, [role="button"] {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 5. 无障碍规范

### 5.1 键盘导航

```tsx
// 可聚焦元素必须有可见焦点状态
"focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"

// Tab 顺序遵循视觉顺序
// 使用 tabIndex 控制顺序（如需要）
```

### 5.2 ARIA 标签

```tsx
// 按钮
<button aria-label="开始吐槽" />

// 图标按钮
<button aria-label="关闭对话框">
  <XIcon />
</button>

// 加载状态
<div role="status" aria-live="polite">
  <span className="sr-only">正在生成吐槽...</span>
  {/* 加载动画 */}
</div>

// 消息列表
<div role="log" aria-live="polite" aria-atomic="false">
  {/* 消息项 */}
</div>
```

### 5.3 焦点管理

```tsx
// 模态框打开时聚焦到第一个可交互元素
// 模态框关闭时返回触发元素
// 焦点 trap 在模态框内

// 使用 useRef + useEffect 管理焦点
const modalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isOpen) {
    modalRef.current?.focus();
  }
}, [isOpen]);
```

### 5.4 屏幕阅读器

```tsx
// 隐藏视觉元素但保留给屏幕阅读器
<div className="sr-only">这是隐藏文字</div>

// 图标的语义化
<button aria-label="分享">
  <ShareIcon aria-hidden="true" />
</button>
```

---

## 6. 图标系统

### 6.1 图标库

使用 **Lucide React** 作为图标库

```bash
npm install lucide-react
```

### 6.2 常用图标

| 功能 | 图标 | 组件名 |
|------|------|--------|
| 关闭 | × | X |
| 分享 | → | Share |
| 复制 | 📋 | Copy |
| 点赞 | 👍 | ThumbsUp |
| 评论 | 💬 | MessageCircle |
| 分享朋友圈 | 🔄 | RefreshCw |
| 收藏 | ⭐ | Star |
| 更多 | ⋯ | MoreVertical |
| 编辑 | ✏️ | Edit |
| 删除 | 🗑️ | Trash2 |
| 发送 | → | Send |

### 6.3 使用规范

```tsx
// 图标尺寸
<Icon className="w-5 h-5" />   // 20px
<Icon className="w-6 h-6" />   // 24px
<Icon className="w-8 h-8" />   // 32px

// 图标颜色
<Icon className="text-gray-400" />
<Icon className="text-orange-500" />
```

---

## 7. Tailwind 配置参考

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          // ... orange 色阶
          500: '#f97316',
          // ...
        },
        secondary: {
          // ... violet 色阶
          500: '#8b5cf6',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'fadeSlideUp 300ms ease-out',
        'message-in': 'messageIn 300ms ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        messageIn: {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.95)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
```

---

## 8. 页面特有规范

### 8.1 首页 (/)

**布局特点**
- 全屏滚动，内容居中
- 话题卡片列表，可横向滚动
- 底部固定 CTA 按钮

**关键元素**
- 品牌标题: `text-3xl font-bold text-gray-800`
- 副标题: `text-base text-gray-500`
- 话题卡片: 见 2.2 业务组件
- CTA 按钮: 固定底部，全宽主按钮

---

### 8.2 体验页 (/experience)

**布局特点**
- 全屏消息流，类似聊天界面
- 顶部显示当前人设
- 消息自动滚动到底部

**关键元素**
- 顶部栏: 人设头像 + 名称 + 返回按钮
- 消息区: `flex-1 overflow-y-auto px-4 py-6`
- 消息气泡: 见 2.2 业务组件
- 打字指示器: 三点跳动动画

---

### 8.3 结果页 (/result)

**布局特点**
- 显示完整吐槽内容
- 操作按钮区域（分享、保存、重来）

**关键元素**
- 人设信息卡片: 头像 + 名称 + 标签
- 吐槽内容区: 可滚动长文本
- 操作按钮组: 横向排列或纵向堆叠
- 分享按钮: 主按钮样式

---

### 8.4 分享页 (/share/[id])

**布局特点**
- 卡片居中展示
- 背景装饰元素
- 响应式适配

**关键元素**
- 分享卡片: 固定比例 4:5
- 装饰元素: 渐变圆点、光晕
- 品牌 footer: "AI喜剧作家" + logo

---

## 9. 开发注意事项

### 9.1 性能优化

1. **图片优化**: 使用 Next.js Image 组件
2. **懒加载**: 路由级别代码分割
3. **防抖节流**: 搜索输入、滚动事件

### 9.2 兼容性

1. **目标浏览器**: iOS Safari 14+, Chrome 90+, 微信内置浏览器
2. **CSS 前缀**: Tailwind 自动处理
3. **Polyfill**: 按需添加

### 9.3 开发建议

1. **组件优先**: 先构建可复用组件，再组装页面
2. **响应式优先**: 移动端设计，桌面端居中展示
3. **状态管理**: 简单状态使用 useState，复杂状态考虑 Zustand
4. **类型安全**: 严格使用 TypeScript

---

## 附录：颜色速查表

### 人设颜色速查

```css
/* 用户人设 */
.人设-毒舌老哥 { --color: #ef4444; --tailwind: red-500; }
.人设-阴阳大师 { --color: #a855f7; --tailwind: purple-500; }
.人设-数据帝   { --color: #0ea5e9; --tailwind: sky-500; }
.人设-热梗王   { --color: #eab308; --tailwind: yellow-500; }
.人设-冷面评委 { --color: #64748b; --tailwind: slate-500; }

/* 场控AI */
.AI-热梗王   { --color: #f59e0b; --tailwind: amber-500; }
.AI-吐槽大师 { --color: #f97316; --tailwind: orange-500; }
.AI-冷面评委 { --color: #475569; --tailwind: slate-600; }
```

---

*文档版本: v1.0 | 最后更新: 2026-02-09*
