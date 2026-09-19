import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://kai@localhost:5432/travel_help'

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: DB_URL })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
