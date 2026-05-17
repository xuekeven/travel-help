# Prisma 学习笔记

> 适用版本：Prisma 6.x  
> 定位：TypeScript 最佳数据库 ORM，Schema 即类型

---

## 一、Prisma 是什么

Prisma 是一款 **TypeScript 优先的 ORM（对象关系映射器）**，包含三个核心组成部分：

| 组件 | 说明 |
|------|------|
| **Prisma Schema** | 用声明式语言定义数据模型，是整个系统的"单一真相源" |
| **Prisma Migrate** | 根据 Schema 变更自动生成 SQL 迁移文件，管理数据库版本 |
| **Prisma Client** | 根据 Schema 自动生成的类型安全数据库客户端 |

**核心价值**：你只需维护一个 `schema.prisma` 文件，Prisma 自动帮你：
1. 生成 SQL 迁移文件（创建/修改表）
2. 生成 TypeScript 类型（`TravelPlan`、`WaitlistOrder` 等）
3. 提供带类型提示的查询 API（写代码时有自动补全）

---

## 二、安装与初始化

```bash
# 安装 Prisma CLI（开发依赖）和 Prisma Client（运行时依赖）
pnpm add -D prisma
pnpm add @prisma/client

# 初始化（生成 prisma/schema.prisma 文件）
pnpm prisma init --datasource-provider postgresql
```

初始化后目录变化：
```
项目根目录/
├── prisma/
│   └── schema.prisma   ← 新增：Schema 定义文件
└── .env                ← 新增：DATABASE_URL 环境变量
```

---

## 三、Schema 语法详解

### 3.1 基本结构

```prisma
// prisma/schema.prisma

// 1. 配置 Prisma Client 生成器
generator client {
  provider = "prisma-client-js"
}

// 2. 配置数据库连接
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // 从 .env 读取
}

// 3. 定义数据模型（对应数据库中的表）
model TravelPlan {
  id   String @id @default(uuid())
  name String
}
```

### 3.2 字段类型映射

| Prisma 类型 | TypeScript 类型 | PostgreSQL 类型 |
|------------|----------------|----------------|
| `String` | `string` | `TEXT` / `VARCHAR` |
| `Int` | `number` | `INTEGER` |
| `Float` | `number` | `DOUBLE PRECISION` |
| `Decimal` | `Decimal` | `DECIMAL` |
| `Boolean` | `boolean` | `BOOLEAN` |
| `DateTime` | `Date` | `TIMESTAMP(3)` |
| `Json` | `object` | `JSONB` |
| `String[]` | `string[]` | `TEXT[]` |

### 3.3 字段修饰符

```prisma
model Example {
  // 必填字段
  required String

  // 可选字段（可为 null）
  optional String?

  // 数组字段
  tags String[]
}
```

### 3.4 字段属性（Attribute）

```prisma
model TravelPlan {
  // @id：主键
  id String @id @default(uuid())

  // @default：默认值
  ticketCount Int      @default(1)
  status      String   @default("PENDING_SALE")
  createdAt   DateTime @default(now())

  // @updatedAt：自动更新为当前时间
  updatedAt DateTime @updatedAt

  // @unique：唯一约束
  orderNo String @unique

  // @db.Date：映射到 PostgreSQL 的 DATE 类型（只有日期，无时间）
  departureDate DateTime @db.Date

  // @db.Decimal(8, 1)：精确小数
  price Decimal @db.Decimal(8, 1)
}
```

### 3.5 枚举

```prisma
// 定义枚举
enum PlanStatus {
  PENDING_SALE
  ON_SALE
  WAITLISTED
  SUCCESS
  FAILED
  CANCELLED
}

model TravelPlan {
  // 使用枚举类型
  status PlanStatus @default(PENDING_SALE)
}
```

生成的 TypeScript 类型：
```typescript
import { PlanStatus } from '@prisma/client'

const status: PlanStatus = PlanStatus.PENDING_SALE
// 或直接用字符串（Prisma 会做类型检查）
const status: PlanStatus = 'PENDING_SALE'
```

### 3.6 @@map 和 @map（命名映射）

Prisma 模型名使用 PascalCase，数据库表名通常用 snake_case：

```prisma
model TravelPlan {
  id            String @id @default(uuid())
  departureDate DateTime @db.Date  // Prisma 字段：驼峰
                                   // 数据库列：自动转为 departure_date

  @@map("travel_plans")  // 数据库表名：travel_plans（默认是 TravelPlan）
}
```

---

## 四、数据库迁移

### 4.1 开发阶段迁移

```bash
# 修改 schema.prisma 后，执行迁移
# --name 是这次迁移的描述性名称
pnpm prisma migrate dev --name init
pnpm prisma migrate dev --name add_remark_to_travel_plan

# 这个命令会：
# 1. 比较 schema 变化，生成 SQL 迁移文件（prisma/migrations/xxx.sql）
# 2. 执行该 SQL，更新数据库结构
# 3. 重新生成 Prisma Client（自动补全更新）
```

### 4.2 生产环境迁移

```bash
# 生产环境不用 migrate dev（会重置数据），用 migrate deploy
pnpm prisma migrate deploy
```

### 4.3 其他常用命令

```bash
# 重新生成 Prisma Client（修改 schema 后手动触发，通常 migrate dev 会自动执行）
pnpm prisma generate

# 将现有数据库结构反向推导为 schema（接手已有数据库时用）
pnpm prisma db pull

# 打开 Prisma Studio（可视化数据库管理界面，开发调试神器）
pnpm prisma studio

# 重置数据库（清空所有数据，重跑所有迁移）⚠️ 危险操作
pnpm prisma migrate reset

# 检查 schema 语法是否正确
pnpm prisma validate

# 格式化 schema 文件
pnpm prisma format
```

---

## 五、Prisma Client 使用

### 5.1 单例模式（重要！）

在 Next.js 开发模式下，热重载会导致多次实例化 PrismaClient，需要使用单例：

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

使用时：
```typescript
import { prisma } from '@/lib/prisma'
```

### 5.2 CRUD 操作

#### 查询（Read）

```typescript
// findMany：查询多条记录
const plans = await prisma.travelPlan.findMany()

// 带条件过滤
const plans = await prisma.travelPlan.findMany({
  where: {
    status: 'PENDING_SALE'
  }
})

// 多条件（AND 关系，默认）
const plans = await prisma.travelPlan.findMany({
  where: {
    status: { in: ['PENDING_SALE', 'ON_SALE'] },
    departureDate: { gte: new Date('2026-05-01') }
  }
})

// OR 关系
const plans = await prisma.travelPlan.findMany({
  where: {
    OR: [
      { status: 'PENDING_SALE' },
      { status: 'ON_SALE' }
    ]
  }
})

// 排序
const plans = await prisma.travelPlan.findMany({
  orderBy: { departureDate: 'asc' }
})

// 多字段排序
const orders = await prisma.waitlistOrder.findMany({
  orderBy: [
    { departureDate: 'asc' },
    { price: 'asc' }
  ]
})

// 分页
const plans = await prisma.travelPlan.findMany({
  skip: 0,   // 跳过前 n 条
  take: 10,  // 取 n 条
})

// 选择特定字段（减少数据传输量）
const plans = await prisma.travelPlan.findMany({
  select: {
    id: true,
    departureDate: true,
    fromStation: true,
    toStation: true
  }
})

// findUnique：按唯一字段查单条（找不到返回 null）
const plan = await prisma.travelPlan.findUnique({
  where: { id: 'some-uuid' }
})

// findFirst：按条件查第一条
const plan = await prisma.travelPlan.findFirst({
  where: { status: 'PENDING_SALE' },
  orderBy: { departureDate: 'asc' }
})

// findUniqueOrThrow / findFirstOrThrow：找不到时抛出异常（不需要手动判空）
const plan = await prisma.travelPlan.findUniqueOrThrow({
  where: { id: 'some-uuid' }
})
```

#### 新增（Create）

```typescript
// create：新增单条
const plan = await prisma.travelPlan.create({
  data: {
    departureDate: new Date('2026-05-01'),
    fromStation: '北京南站',
    toStation: '天津南站',
    seatType: 'SECOND_CLASS',
    ticketCount: 1,
    status: 'PENDING_SALE'
  }
})
// 返回值：完整的新记录（含 id、createdAt 等）

// createMany：批量新增
await prisma.travelPlan.createMany({
  data: [
    { departureDate: new Date('2026-05-01'), fromStation: '北京南站', toStation: '天津南站', seatType: 'SECOND_CLASS' },
    { departureDate: new Date('2026-06-03'), fromStation: '北京西站', toStation: '邯郸东站', seatType: 'SECOND_CLASS' }
  ]
})
// 注意：createMany 不返回创建的记录，只返回 { count: n }
```

#### 更新（Update）

```typescript
// update：按唯一字段更新单条
const plan = await prisma.travelPlan.update({
  where: { id: 'some-uuid' },
  data: {
    status: 'SUCCESS',
    // updatedAt 会自动更新，无需手动写
  }
})

// updateMany：批量更新
await prisma.travelPlan.updateMany({
  where: { status: 'ON_SALE' },
  data: { status: 'WAITLISTED' }
})
// 返回 { count: n }，不返回更新的记录
```

#### 删除（Delete）

```typescript
// delete：删除单条
await prisma.travelPlan.delete({
  where: { id: 'some-uuid' }
})

// deleteMany：批量删除
await prisma.travelPlan.deleteMany({
  where: { status: 'CANCELLED' }
})
```

#### UPSERT（本项目候补订单同步的核心）

```typescript
// upsert：存在则更新，不存在则插入
await prisma.waitlistOrder.upsert({
  where: { orderNo: 'E123456' },  // 用唯一字段定位
  create: {
    // 不存在时：执行插入
    orderNo: 'E123456',
    departureDate: new Date('2026-05-01'),
    fromStation: '北京南站',
    toStation: '天津南站',
    trainNumbers: ['G1', 'G3'],
    seatType: '二等座',
    ticketCount: 1,
    price: 54.5,
    departureTime: '08:00',
    arrivalTime: '08:31',
    status: '候补中',
    rawData: { /* 原始 JSON */ }
  },
  update: {
    // 已存在时：只更新这些字段
    status: '候补中',
    rawData: { /* 原始 JSON */ },
    // syncedAt 设置了 @updatedAt，会自动更新
  }
})
```

#### 批量 UPSERT（候补订单同步场景）

```typescript
// Prisma 没有原生的 createManyAndReturn 或批量 upsert
// 最佳实践：用 Promise.all 并行执行多个 upsert
async function syncWaitlistOrders(orders: RawOrder[]) {
  await Promise.all(
    orders.map(order =>
      prisma.waitlistOrder.upsert({
        where: { orderNo: order.orderNo },
        create: { ...order },
        update: { status: order.status, rawData: order.rawData }
      })
    )
  )
}
```

### 5.3 计数

```typescript
// count：计数
const count = await prisma.travelPlan.count()
const pendingCount = await prisma.travelPlan.count({
  where: { status: 'PENDING_SALE' }
})
```

### 5.4 原始 SQL（复杂查询时使用）

```typescript
// $queryRaw：执行原始 SQL，返回类型安全的结果
const result = await prisma.$queryRaw<Array<{ departure_date: Date; count: bigint }>>`
  SELECT departure_date, COUNT(*) as count
  FROM waitlist_orders
  GROUP BY departure_date
  ORDER BY departure_date ASC
`

// $executeRaw：执行不需要返回值的 SQL（UPDATE、DELETE 等）
await prisma.$executeRaw`
  UPDATE travel_plans
  SET status = 'ON_SALE'
  WHERE departure_date - INTERVAL '14 days' = CURRENT_DATE
`
```

### 5.5 事务

```typescript
// $transaction：事务，所有操作要么全成功，要么全回滚
const [plan, order] = await prisma.$transaction([
  prisma.travelPlan.update({ where: { id }, data: { status: 'SUCCESS' } }),
  prisma.waitlistOrder.update({ where: { orderNo }, data: { status: '已成功' } })
])

// 交互式事务（更复杂的场景）
await prisma.$transaction(async (tx) => {
  const plan = await tx.travelPlan.findUniqueOrThrow({ where: { id } })
  if (plan.status !== 'WAITLISTED') {
    throw new Error('只有候补中的计划才能标记为成功')
  }
  await tx.travelPlan.update({ where: { id }, data: { status: 'SUCCESS' } })
})
```

---

## 六、在本项目中的具体使用

### 出行计划 CRUD

```typescript
// app/api/plans/route.ts

// GET：查询所有出行计划，按出行日期正序
const plans = await prisma.travelPlan.findMany({
  orderBy: { departureDate: 'asc' }
})

// POST：新增出行计划
const plan = await prisma.travelPlan.create({ data: body })
```

```typescript
// app/api/plans/[id]/route.ts

// PUT：更新出行计划
const plan = await prisma.travelPlan.update({
  where: { id },
  data: body
})

// DELETE：删除出行计划
await prisma.travelPlan.delete({ where: { id } })
```

### 定时任务查询

```typescript
// lib/cron.ts

// 查询"今天开售"和"明天开售"的出行计划
import { subDays, startOfDay, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'Asia/Shanghai'
const todayCN = format(toZonedTime(new Date(), TIMEZONE), 'yyyy-MM-dd')

// 今天开售：出行日期 - 14天 = 今天
const todaySalePlans = await prisma.travelPlan.findMany({
  where: {
    departureDate: new Date(
      new Date(todayCN).getTime() + 14 * 24 * 60 * 60 * 1000
    ),
    status: { in: ['PENDING_SALE', 'ON_SALE'] }
  }
})

// 明天开售：出行日期 - 15天 = 今天
const tomorrowSalePlans = await prisma.travelPlan.findMany({
  where: {
    departureDate: new Date(
      new Date(todayCN).getTime() + 15 * 24 * 60 * 60 * 1000
    ),
    status: { in: ['PENDING_SALE', 'ON_SALE'] }
  }
})
```

### 候补订单同步

```typescript
// app/api/waitlist/sync/route.ts

// 批量 upsert，以 orderNo 为唯一键
await Promise.all(
  orders.map((order) =>
    prisma.waitlistOrder.upsert({
      where: { orderNo: order.orderNo },
      create: order,
      update: {
        status: order.status,
        trainNumbers: order.trainNumbers,
        rawData: order.rawData,
      },
    })
  )
)
```

### 候补订单聚合查询

```typescript
// app/api/waitlist/route.ts

const orders = await prisma.waitlistOrder.findMany({
  orderBy: [{ departureDate: 'asc' }, { departureTime: 'asc' }]
})

// 在 TypeScript 中聚合分组
const grouped = orders.reduce((acc, order) => {
  const key = `${order.departureDate.toISOString().slice(0,10)}|${order.fromStation}|${order.toStation}`
  if (!acc[key]) {
    acc[key] = {
      groupKey: key,
      departureDate: order.departureDate,
      fromStation: order.fromStation,
      toStation: order.toStation,
      orders: []
    }
  }
  acc[key].orders.push(order)
  return acc
}, {} as Record<string, GroupedOrders>)
```

---

## 七、Prisma Studio（可视化管理界面）

开发阶段调试数据的神器：

```bash
pnpm prisma studio
# 打开 http://localhost:5555
# 可以直接在浏览器中查看、编辑、新增、删除数据
```

---

## 八、常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `Cannot find module '.prisma/client'` | 忘记生成 Client | `pnpm prisma generate` |
| `PrismaClientKnownRequestError: Record to update not found` | WHERE 条件没有匹配到记录 | 用 `findUnique` 先检查是否存在 |
| 开发模式下 `Too many clients` 警告 | 热重载多次实例化 PrismaClient | 使用 `lib/prisma.ts` 单例模式 |
| 修改 schema 后类型没更新 | Client 没有重新生成 | `pnpm prisma generate` 或 `pnpm prisma migrate dev` |
| 枚举值在数据库是大写，查询时大小写不对 | Prisma 枚举直接映射数据库枚举 | 用 Prisma 生成的枚举类型，不要手写字符串 |

---

## 九、推荐学习资源

1. [Prisma 官方文档](https://www.prisma.io/docs) - 官方文档质量很高，有大量示例
2. [Prisma Schema 参考](https://www.prisma.io/docs/orm/reference/prisma-schema-reference) - 字段属性全览
3. [Prisma Client API 参考](https://www.prisma.io/docs/orm/reference/prisma-client-reference) - 所有查询方法详解
4. `pnpm prisma studio` - 开发时直接看数据库，比翻文档更直观
