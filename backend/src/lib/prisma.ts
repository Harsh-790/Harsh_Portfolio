import { PrismaClient } from '@prisma/client';

/**
 * One Prisma client for the API process.
 * The global cache also keeps hot reloads from opening extra MongoDB pools.
 */
const globalForPrisma = globalThis as unknown as { portfolioPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.portfolioPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.portfolioPrisma = prisma;
