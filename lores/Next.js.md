# Next.js 学习笔记

> 适用版本：Next.js 15（App Router）  
> 定位：前端工程师入门全栈的最佳路径之一

---

## 一、Next.js 是什么

Next.js 是由 Vercel 开发的 **React 全栈框架**。它在 React 的基础上，内置了：

- **服务端渲染（SSR）** 和 **静态生成（SSG）**
- **文件系统路由**（文件即路由）
- **API Routes**（用 TypeScript 写后端接口，和前端同项目）
- **内置优化**（图片、字体、脚本的自动优化）

**核心价值**：让前端工程师用一门语言（TypeScript）、一个项目、同一套工具链，同时写前端和后端，这是它成为全栈入门首选的原因。

### 与传统 React 开发的区别

| 对比 | Create React App / Vite | Next.js |
|------|------------------------|---------|
| 渲染方式 | 纯客户端渲染（CSR） | SSR / SSG / CSR 混合 |
| 路由 | 需要安装 react-router | 内置，文件即路由 |
| 后端 | 需要单独项目 | 内置 API Routes |
| SEO | 弱（页面内容客户端生成） | 强（服务端生成 HTML） |
| 部署 | 静态文件 | 需要 Node.js 服务器 |

---

## 二、App Router vs Pages Router

Next.js 有两套路由系统，你只需要学 **App Router**（13 版本引入，15 版本已全面稳定）。

| | App Router（推荐） | Pages Router（旧） |
|--|--|--|
| 目录 | `app/` | `pages/` |
| 组件默认类型 | Server Component | Client Component |
| 数据获取 | `async/await` 直接在组件里 | `getServerSideProps` / `getStaticProps` |
| 状态 | 当前主流推荐 | 逐渐被取代，但仍可用 |

---

## 三、核心概念

### 3.1 文件系统路由

`app/` 目录下的文件结构直接对应 URL 路径：

```
app/
├── page.tsx           →  /
├── plans/
│   └── page.tsx       →  /plans
├── waitlist/
│   └── page.tsx       →  /waitlist
└── plans/[id]/
    └── page.tsx       →  /plans/123（动态路由）
```

**约定文件名（App Router）：**

| 文件名 | 作用 |
|--------|------|
| `page.tsx` | 页面组件（该路由的 UI） |
| `layout.tsx` | 布局组件（包裹子路由，不会因路由切换重新渲染） |
| `loading.tsx` | 加载中状态（自动 Suspense） |
| `error.tsx` | 错误边界 |
| `not-found.tsx` | 404 页面 |
| `route.ts` | API 路由（后端接口，无 UI） |

### 3.2 Server Components vs Client Components

这是 App Router 最重要的概念，也是最容易混淆的地方。

**Server Component（默认）：**

```tsx
// app/plans/page.tsx
// 没有 "use client" 指令 → 默认是 Server Component

// 可以直接 async/await，直接访问数据库
// 代码不会发送到浏览器，安全
async function PlansPage() {
  const plans = await prisma.travelPlan.findMany() // 直接查数据库！
  return <div>{plans.map(p => <PlanCard key={p.id} plan={p} />)}</div>
}
```

**Client Component：**

```tsx
"use client" // 必须在文件顶部声明

// 可以用 useState、useEffect、onClick 等浏览器 API
// 代码会发送到浏览器执行
import { useState } from 'react'

function PlanForm() {
  const [name, setName] = useState('')
  return <input value={name} onChange={e => setName(e.target.value)} />
}
```

**选择原则（重要）：**

- 默认写 Server Component
- 需要以下功能时，才加 `"use client"`：
  - `useState` / `useEffect` / 其他 React Hooks
  - 浏览器事件（`onClick`、`onChange` 等）
  - 浏览器 API（`localStorage`、`window` 等）

### 3.3 API Routes（Route Handlers）

在 `app/api/` 目录下创建 `route.ts` 文件，即可定义后端接口：

```typescript
// app/api/plans/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/plans
export async function GET(request: NextRequest) {
  const plans = await prisma.travelPlan.findMany({
    orderBy: { departureDate: 'asc' }
  })
  return NextResponse.json({ data: plans })
}

// POST /api/plans
export async function POST(request: NextRequest) {
  const body = await request.json()
  const plan = await prisma.travelPlan.create({ data: body })
  return NextResponse.json({ data: plan }, { status: 201 })
}
```

```typescript
// app/api/plans/[id]/route.ts

// PUT /api/plans/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // Next.js 15 中 params 是 Promise
  const body = await request.json()
  const plan = await prisma.travelPlan.update({
    where: { id },
    data: body
  })
  return NextResponse.json({ data: plan })
}

// DELETE /api/plans/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.travelPlan.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
```

### 3.4 数据获取方式

App Router 中推荐的数据获取方式：

**方式 A：在 Server Component 中直接读取数据库（推荐，适合初始数据）**

```tsx
// 直接 async/await，无需 useEffect，无需 API 调用
async function PlansPage() {
  const plans = await prisma.travelPlan.findMany()
  return <PlanList plans={plans} />
}
```

**方式 B：在 Client Component 中调用 API（适合交互后的数据更新）**

```tsx
"use client"
import { useEffect, useState } from 'react'

function PlanList() {
  const [plans, setPlans] = useState([])

  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(data => setPlans(data.data))
  }, [])

  return <div>...</div>
}
```

**方式 C：使用 Server Actions（进阶，表单提交直接调服务端函数）**

```tsx
// 在 Server Component 中定义
async function createPlan(formData: FormData) {
  'use server'  // 标记为 Server Action
  await prisma.travelPlan.create({
    data: {
      fromStation: formData.get('fromStation') as string,
      // ...
    }
  })
  revalidatePath('/plans')  // 刷新页面数据
}

// 在 form 的 action 中使用
<form action={createPlan}>
  <input name="fromStation" />
  <button type="submit">提交</button>
</form>
```

### 3.5 instrumentation.ts（服务端初始化）

这是本项目启动定时任务的关键文件：

```typescript
// instrumentation.ts（在项目根目录，与 app/ 平级）

export async function register() {
  // 只在 Node.js 运行时执行（排除 Edge Runtime）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 动态导入，避免在 Edge 环境中报错
    const { startCronJobs } = await import('./lib/cron')
    startCronJobs()
    console.log('定时任务已启动')
  }
}
```

需要在 `next.config.ts` 中开启：
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    instrumentationHook: true  // Next.js 15 中已默认开启，可不写
  }
}
```

---

## 四、项目配置

### 4.1 next.config.ts

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 开启实验性功能
  experimental: {
    instrumentationHook: true,
  },
  // 服务端外部包（node-cron 等不需要打包的包）
  serverExternalPackages: ['node-cron'],
}

export default nextConfig
```

### 4.2 tsconfig.json 路径别名

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]  // 用 @/lib/prisma 代替 ../../lib/prisma
    }
  }
}
```

### 4.3 环境变量

Next.js 内置环境变量支持，无需 `dotenv`：

```
.env.local          # 本地开发（不提交 git）
.env.production     # 生产环境（不提交 git）
.env.example        # 模板（提交 git，不含真实值）
```

| 变量前缀 | 可访问位置 |
|----------|----------|
| `NEXT_PUBLIC_` | 前端（浏览器）和后端均可访问 |
| 无前缀 | 只有后端（Server Component、API Routes）可访问 |

---

## 五、常用 API 速查

### NextRequest

```typescript
import { NextRequest } from 'next/server'

// 获取查询参数 /api/plans?status=PENDING_SALE
request.nextUrl.searchParams.get('status')

// 获取请求体
const body = await request.json()

// 获取请求头
request.headers.get('authorization')
```

### NextResponse

```typescript
import { NextResponse } from 'next/server'

// 返回 JSON
NextResponse.json({ data: [] })
NextResponse.json({ error: 'Not Found' }, { status: 404 })

// 重定向
NextResponse.redirect(new URL('/plans', request.url))

// 空响应（204）
new NextResponse(null, { status: 204 })
```

### 常用 Hooks（Client Component）

```typescript
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation'

// 编程式路由跳转
const router = useRouter()
router.push('/plans')
router.refresh()  // 重新获取当前页面的 Server Component 数据（重要！）

// 获取动态路由参数 /plans/[id]
const params = useParams()
params.id

// 获取当前路径
const pathname = usePathname()

// 获取查询参数
const searchParams = useSearchParams()
searchParams.get('status')
```

### revalidatePath / revalidateTag（缓存刷新）

```typescript
import { revalidatePath } from 'next/cache'

// 在 Server Action 或 API Route 中调用，让某个路径的缓存失效并重新获取
revalidatePath('/plans')        // 刷新 /plans 页面的数据
revalidatePath('/api/plans')    // 刷新某个 API 路由的缓存
```

---

## 六、在本项目中的使用情况

| 功能 | 使用的 Next.js 特性 |
|------|-------------------|
| 出行计划列表页 | Server Component + 直接读 Prisma |
| 新增/编辑计划表单 | Client Component（需要 useState 处理表单状态） |
| 出行计划 CRUD 接口 | API Routes（`app/api/plans/route.ts`） |
| 候补订单展示页 | Server Component + Client Component（排序切换） |
| 候补订单同步接口 | API Routes（`app/api/waitlist/sync/route.ts`） |
| 定时任务启动 | `instrumentation.ts` + node-cron |
| 页面布局 | `app/layout.tsx`（侧边栏导航） |

---

## 七、推荐学习路径

1. [Next.js 官方文档](https://nextjs.org/docs) - 官方文档质量极高，中文版略落后
2. [Next.js Learn 官方课程](https://nextjs.org/learn) - 免费，边做边学，强烈推荐
3. **本项目实践** - 先把出行计划的 CRUD 跑通，就掌握了 80% 的核心用法

---

## 八、常见陷阱

| 问题 | 原因 | 解决 |
|------|------|------|
| `useState is not defined` 等报错 | 在 Server Component 中用了 Client 特性 | 文件顶部加 `"use client"` |
| 数据更新了但页面没变 | Server Component 数据已缓存 | 调用 `router.refresh()` 或 `revalidatePath()` |
| `params` 相关类型报错 | Next.js 15 中 params 变成了 Promise | 用 `await params` 解构 |
| 定时任务开发环境重复执行 | 开发模式下热重载会多次初始化 | 用环境变量判断，生产环境才启动 cron |
| 环境变量在前端读不到 | 没有加 `NEXT_PUBLIC_` 前缀 | 前端需要的变量加 `NEXT_PUBLIC_` 前缀 |
