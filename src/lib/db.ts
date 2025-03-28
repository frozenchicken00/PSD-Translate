import { PrismaClient } from '@prisma/client';

// Create a singleton instance of PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

// Use a single instance of Prisma Client in development
// to prevent multiple connections in hot reload
export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Helper function to handle Prisma operations with proper types
export async function handlePrismaOperation<T>(
  operation: () => Promise<T>,
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    console.error('Prisma operation error:', error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
} 