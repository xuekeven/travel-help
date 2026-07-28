# 12306 买票助手

一个用于管理火车购票计划、同步 12306 出行订单和候补订单，并通过企业微信发送关键时间提醒的个人工具。

## 主要功能

- **购票计划**：记录出行日期、车站、席别和开售时间；支持多个开售时间，并通过持久化任务在售前 24 小时和售前 15 分钟可靠提醒。
- **出行订单**：通过 Chrome 插件同步 12306 未出行订单，展示车次、旅客、席位、票价和退票费用；在出行日期前 2 天、前 1 天和当天的 00:00 提醒。
- **候补订单**：通过 Chrome 插件同步候补订单，按行程分组展示候补车次、座位和状态；未候补成功时发送临近出行提醒。

## 技术组成

- Next.js 16 + React 19 + TypeScript
- Ant Design
- PostgreSQL + Prisma
- Chrome Extension（同步 12306 订单数据）
- node-cron（定时任务）
- 企业微信消息中转服务（可选）

项目没有需要单独启动的后端服务。`pnpm dev` 会同时启动 Next.js 页面、API 路由和定时提醒任务。

## 本地运行

要求：Node.js、pnpm 和 PostgreSQL。

```bash
pnpm install
pnpm prisma migrate deploy
pnpm dev
```

打开 <http://localhost:3005>。

仅查看模拟数据时，可以运行：

```bash
pnpm dev-mock
```

模拟数据页面地址为 <http://localhost:3006>。

## 环境变量

在项目根目录创建 `.env`：

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/12306_help"
EXTENSION_SYNC_TOKEN="your-sync-token"

# 企业微信提醒，可选；未配置时只在控制台输出通知
WEWORK_RELAY_BASE_URL="https://your-wework-relay.example.com"
WEWORK_RELAY_API_KEY="your-api-key"
WECOM_TO_USER="your-user-id"
```

## Chrome 插件

插件代码位于 `extension/`，用于从已登录的 12306 页面同步未出行订单和候补订单。安装及配置方式见 [extension/README.md](extension/README.md)。

## 生产部署

```bash
pnpm build
pm2 start ecosystem.config.js
pm2 save
```

`ecosystem.config.js` 会通过 `pnpm start` 运行 Next.js，并由 PM2 负责进程守护、自动重启和日志管理。生产环境通过 nginx 挂载到 `/12306/` 时，由 nginx 将 `/12306/` 转发到 Next.js 根路径。详细配置见 [docs/5.生产部署.md](docs/5.生产部署.md)。

更多需求、架构和通知说明位于 [docs/](docs/)。
