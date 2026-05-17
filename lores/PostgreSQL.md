# PostgreSQL 学习笔记

> 适用版本：PostgreSQL 16  
> 定位：全栈开发的主流关系型数据库

---

## 一、PostgreSQL 是什么

PostgreSQL（简称 Postgres）是一款**开源的关系型数据库管理系统（RDBMS）**，以功能强大、标准兼容度高著称，被认为是功能最完整的开源数据库之一。

### 与 MySQL 的主要区别

| 特性 | PostgreSQL | MySQL |
|------|-----------|-------|
| JSON/JSONB | 原生支持，可索引查询 | 支持，但功能较弱 |
| 数组类型 | 原生支持（`TEXT[]`、`INT[]` 等） | 不支持 |
| 全文搜索 | 内置，功能强大 | 基础支持 |
| 事务 | 完整 ACID，所有操作均支持 | InnoDB 支持，部分操作不支持 |
| 窗口函数 | 完整支持 | 8.0 后支持 |
| 枚举类型 | 原生 ENUM 类型 | 支持但语法不同 |
| 社区/生态 | 学术/企业偏好，AI/数据领域主流 | 互联网应用历史积累深 |
| 许可证 | PostgreSQL 许可（极为宽松） | GPL（商业使用需注意） |

**选 PostgreSQL 的核心理由（本项目视角）：**
- JSONB 类型完美存储 12306 候补单原始数据，且可以对 JSON 字段建索引查询
- 数组类型直接存候补车次列表（`["G1", "G3", "G5"]`），不需要额外的关联表
- 是 Prisma、Supabase、Railway 等现代工具链的首选数据库

---

## 二、核心概念

### 2.1 数据类型

**常用类型速查：**

| 类型 | 说明 | 示例 |
|------|------|------|
| `VARCHAR(n)` | 变长字符串，最大 n 字符 | `'北京南站'` |
| `TEXT` | 不限长度字符串 | 备注、原始数据 |
| `INT` / `INTEGER` | 32 位整数 | `1`, `100` |
| `BIGINT` | 64 位整数 | 大 ID |
| `DECIMAL(p, s)` | 精确小数，p 总位数，s 小数位 | `54.50` |
| `BOOLEAN` | 布尔值 | `true`, `false` |
| `DATE` | 只有日期，无时间 | `'2026-05-01'` |
| `TIMESTAMP` | 日期+时间，无时区 | `'2026-05-01 08:00:00'` |
| `TIMESTAMPTZ` | 日期+时间+时区（推荐） | UTC 存储，按时区展示 |
| `UUID` | 128 位唯一标识符 | `'550e8400-...'` |
| `JSONB` | 二进制 JSON（可索引，推荐） | `{"key": "value"}` |
| `JSON` | 文本 JSON（不可索引） | 存文本时用 |
| `TEXT[]` | 文本数组 | `'{G1,G3,G5}'` |
| `ENUM` | 枚举类型（Prisma 会自动创建） | `'PENDING_SALE'` |

### 2.2 主键策略

```sql
-- 方式 1：自增整数（简单，适合内部数据）
id SERIAL PRIMARY KEY
-- 或
id BIGSERIAL PRIMARY KEY

-- 方式 2：UUID（推荐，分布式安全，URL 友好）
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

本项目使用 UUID，由 Prisma 生成（`@default(uuid())`）。

### 2.3 时区处理（重要！）

这是最容易出 bug 的地方，必须理解清楚。

```sql
-- TIMESTAMP 不存时区信息：存什么是什么
SELECT TIMESTAMP '2026-05-01 08:00:00';
-- → 2026-05-01 08:00:00

-- TIMESTAMPTZ 存 UTC，展示时按会话时区转换（推荐）
SELECT TIMESTAMPTZ '2026-05-01 08:00:00+08';
-- 内部存储为 2026-05-01 00:00:00 UTC
-- 查询时按客户端时区显示
```

**本项目策略：**
- `created_at`、`updated_at` 等用 `TIMESTAMPTZ`（Prisma 默认）
- `departure_date` 用 `DATE` 类型（只有日期，无时区问题）
- 所有时间计算在 TypeScript 层处理，使用 `date-fns-tz` 库进行时区转换

---

## 三、常用 SQL 语法

### 3.1 DDL（数据定义）

```sql
-- 创建表
CREATE TABLE travel_plans (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_date DATE      NOT NULL,
  holiday_name   TEXT,
  from_station   TEXT      NOT NULL,
  to_station     TEXT      NOT NULL,
  status         TEXT      NOT NULL DEFAULT 'PENDING_SALE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加列
ALTER TABLE travel_plans ADD COLUMN remark TEXT;

-- 删除列
ALTER TABLE travel_plans DROP COLUMN remark;

-- 删除表
DROP TABLE travel_plans;
DROP TABLE IF EXISTS travel_plans;  -- 不存在也不报错
```

### 3.2 DML（数据操作）

```sql
-- 插入
INSERT INTO travel_plans (departure_date, from_station, to_station, status)
VALUES ('2026-05-01', '北京南站', '天津南站', 'PENDING_SALE');

-- 批量插入
INSERT INTO travel_plans (departure_date, from_station, to_station)
VALUES
  ('2026-05-01', '北京南站', '天津南站'),
  ('2026-06-03', '北京西站', '邯郸东站');

-- 查询
SELECT * FROM travel_plans;
SELECT id, departure_date, from_station FROM travel_plans WHERE status = 'PENDING_SALE';

-- 更新
UPDATE travel_plans
SET status = 'SUCCESS', updated_at = NOW()
WHERE id = 'some-uuid';

-- 删除
DELETE FROM travel_plans WHERE id = 'some-uuid';

-- UPSERT（本项目候补订单同步的核心操作）
-- 以 order_no 为唯一键：存在则更新，不存在则插入
INSERT INTO waitlist_orders (order_no, departure_date, from_station, status)
VALUES ('E123456', '2026-05-01', '北京南站', '候补中')
ON CONFLICT (order_no) 
DO UPDATE SET
  status = EXCLUDED.status,
  synced_at = NOW();
```

### 3.3 查询进阶

```sql
-- 条件过滤
SELECT * FROM travel_plans
WHERE departure_date >= '2026-05-01'
  AND status IN ('PENDING_SALE', 'ON_SALE');

-- 排序
SELECT * FROM travel_plans ORDER BY departure_date ASC;
SELECT * FROM waitlist_orders ORDER BY price ASC, departure_time ASC;

-- 分页
SELECT * FROM travel_plans ORDER BY departure_date LIMIT 10 OFFSET 20;

-- 日期计算（本项目的核心查询）
-- 查找"今天开售"的出行计划（出行日期 - 14天 = 今天）
SELECT * FROM travel_plans
WHERE departure_date - INTERVAL '14 days' = CURRENT_DATE;

-- 查找"明天开售"的出行计划（出行日期 - 15天 = 今天）
SELECT * FROM travel_plans
WHERE departure_date - INTERVAL '15 days' = CURRENT_DATE;

-- JSON 字段查询（JSONB）
SELECT * FROM waitlist_orders
WHERE raw_data->>'trainType' = 'G';  -- ->> 提取为文本

-- 数组字段查询
SELECT * FROM waitlist_orders
WHERE 'G1' = ANY(train_numbers);  -- 查包含 G1 的订单
```

### 3.4 聚合与分组

```sql
-- 候补订单按（出发日期+始发站+终到站）分组统计
SELECT
  departure_date,
  from_station,
  to_station,
  COUNT(*) AS order_count,
  MIN(price) AS min_price
FROM waitlist_orders
GROUP BY departure_date, from_station, to_station
ORDER BY departure_date ASC;
```

---

## 四、索引

索引加速查询，但会略微降低写入速度。本项目建议添加的索引：

```sql
-- 出行计划：按出行日期查询（定时任务每天查）
CREATE INDEX idx_travel_plans_departure_date ON travel_plans(departure_date);

-- 出行计划：按状态过滤
CREATE INDEX idx_travel_plans_status ON travel_plans(status);

-- 候补订单：唯一索引（UPSERT 依赖它）
-- Prisma 的 @unique 会自动创建，无需手动写

-- 候补订单：聚合查询的联合索引
CREATE INDEX idx_waitlist_group ON waitlist_orders(departure_date, from_station, to_station);

-- JSONB 索引（如需要按 JSON 字段查询）
CREATE INDEX idx_waitlist_raw ON waitlist_orders USING GIN(raw_data);
```

> ⚠️ 本项目数据量极小（个人工具），索引的性能收益不明显，主要是学习索引的概念和语法。

---

## 五、常用管理命令（psql CLI）

```bash
# 连接到数据库
psql -d 12306_help
psql -U postgres -d 12306_help

# 在 psql 中的常用命令（以 \ 开头）
\l          # 列出所有数据库
\c dbname   # 切换数据库
\dt         # 列出当前数据库的所有表
\d tablename # 描述表结构（列、类型、索引）
\q          # 退出 psql
\timing     # 开启/关闭查询耗时显示
\x          # 开启/关闭扩展显示模式（列数多时好用）

# 导出数据库
pg_dump 12306_help > backup.sql

# 恢复数据库
psql 12306_help < backup.sql
```

---

## 六、本地安装（macOS）

```bash
# 安装 PostgreSQL 16
brew install postgresql@16

# 启动服务（开机自启）
brew services start postgresql@16

# 创建数据库
createdb 12306_help

# 连接
psql -d 12306_help

# 查看服务状态
brew services list

# 停止服务
brew services stop postgresql@16
```

**连接字符串格式：**
```
postgresql://用户名:密码@主机:端口/数据库名
postgresql://localhost:5432/12306_help           # 无密码（本地开发常见）
postgresql://admin:password@localhost:5432/12306_help
```

---

## 七、在本项目中的使用情况

| 表 | 说明 |
|----|------|
| `travel_plans` | 出行计划，由 Next.js 后端通过 Prisma 增删改查 |
| `waitlist_orders` | 候补订单，通过 Chrome Extension 同步，以 `order_no` 做 UPSERT |

**本项目基本不直接写 SQL**，所有数据库操作均通过 **Prisma ORM** 完成（见 Prisma.md）。了解 SQL 的目的是：

1. 理解 Prisma 生成的查询实际在做什么
2. 能够直接在 psql 中调试、排查数据问题
3. 写一些 Prisma 不好表达的复杂查询时可以用 `prisma.$queryRaw`

---

## 八、推荐学习资源

1. [PostgreSQL 官方文档](https://www.postgresql.org/docs/16/)
2. [PostgreSQL Tutorial](https://www.postgresqltutorial.com/) - 非常系统的入门教程
3. [Use The Index, Luke](https://use-the-index-luke.com/) - 专讲数据库索引，图文并茂
