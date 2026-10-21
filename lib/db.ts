import { PrismaClient } from '@prisma/client';

/**
 * A single Prisma client for the whole app.
 * In development Next.js re-evaluates modules on every change, so the instance
 * is cached on globalThis to avoid creating extra MongoDB connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
