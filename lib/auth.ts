import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { compare } from 'bcryptjs';
import { db } from './db';
import { isMongoObjectId } from './object-id';

const COOKIE_NAME = 'portfolio_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    // Refusing to sign with a weak secret is safer than silently using a default.
    throw new Error('AUTH_SECRET is missing or too short. Set it in .env (see .env.example).');
  }
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function createToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): { uid: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const uid = data?.uid;
    // A cookie signed before the MongoDB migration may still contain a CUID.
    // Reject it here so no caller can pass it to Prisma as an ObjectId.
    if (!isMongoObjectId(uid) || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return { uid };
  } catch {
    return null;
  }
}

export type SessionUser = { id: string; name: string; email: string };

/** Current admin, or null. Never throws for a missing/invalid cookie. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = readToken(store.get(COOKIE_NAME)?.value);
  // Belt-and-suspenders: never hand a malformed ID to a MongoDB ObjectId query.
  if (!session || !isMongoObjectId(session.uid)) return null;
  const user = await db.user.findUnique({
    where: { id: session.uid },
    select: { id: true, name: true, email: true },
  });
  return user;
}

/** Used by every admin page and admin server action. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  return user;
}

export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    // spend roughly the same time as a real comparison
    await compare(password, '$2a$12$0000000000000000000000000000000000000000000000000000');
    return null;
  }
  const ok = await compare(password, user.passwordHash);
  if (!ok) return null;
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, name: user.name, email: user.email };
}

export async function startSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const SESSION_COOKIE = COOKIE_NAME;
