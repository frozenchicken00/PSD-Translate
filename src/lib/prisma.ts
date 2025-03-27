import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// For environments where you need Edge compatibility (middleware, edge functions)
const createPrismaClient = () => {
  // Create a base PrismaClient instance
  const prismaClient = new PrismaClient()
  
  // OPTION 1: If using Prisma Accelerate
  if (process.env.PRISMA_ACCELERATE_URL) {
    return prismaClient.$extends(withAccelerate())
  }
  
  // OPTION 2: Standard PrismaClient for server environments
  return prismaClient
}

// For server contexts, use the global instance to prevent connection pool exhaustion
const globalForPrisma = global as unknown as { prisma: ReturnType<typeof createPrismaClient> }
export const prisma = globalForPrisma.prisma || createPrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
export default prisma

// Edge-compatible client (always creates a new instance)
// Use this in Edge runtime environments
export function getPrismaClient() {
  return createPrismaClient()
}