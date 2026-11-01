import { PrismaClient } from '@prisma/client';

/**
 * MongoDB's default server-selection timeout is 30 seconds. That is far too
 * long for a visitor waiting on the contact form or an admin waiting for a
 * dashboard. Five seconds still leaves room for a healthy Atlas handshake but
 * lets the API fail cleanly when the database is unreachable.
 */
const SERVER_SELECTION_TIMEOUT_MS = 5_000;

function datasourceUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured.');

  // Respect an explicit setting from the environment; otherwise add a bounded
  // timeout without rewriting the credentials or any other connection option.
  if (/(?:[?&])serverSelectionTimeoutMS=/i.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}serverSelectionTimeoutMS=${SERVER_SELECTION_TIMEOUT_MS}`;
}

/**
 * One Prisma client for the API process.
 * The global cache also keeps hot reloads from opening extra MongoDB pools.
 */
const globalForPrisma = globalThis as unknown as { portfolioPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.portfolioPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: { db: { url: datasourceUrl() } },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.portfolioPrisma = prisma;
