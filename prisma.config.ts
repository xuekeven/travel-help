import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Prisma 7.x 配置文件
// 仅供 prisma migrate / prisma studio 等 CLI 命令使用
// PrismaClient 运行时连接通过 lib/prisma.ts 中的 adapter 配置
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://kai@localhost:5432/12306_help',
  },
})
