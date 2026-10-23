import { createHmac, timingSafeEqual } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { prisma } from './prisma';
import { isMongoObjectId } from './object-id';

export const SESSION_COOKIE = 'portfolio_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = { id: string; name: string; email: string };

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error('AUTH_SECRET is missing or too short. Set it in the backend environment.');
  }
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): { uid: string } | null {
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
    if (!isMongoObjectId(uid) || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return { uid };
  } catch {
    return null;
  }
}

export function tokenFromAuthorization(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

/** Resolve the admin represented by a signed bearer token. */
export async function getUserFromToken(token: string | undefined): Promise<SessionUser | null> {
  const session = readToken(token);
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, name: true, email: true },
  });
}

export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    // Spend roughly the same time as a real comparison.
    await compare(password, '$2a$12$0000000000000000000000000000000000000000000000000000');
    return null;
  }

  const ok = await compare(password, user.passwordHash);
  if (!ok) return null;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { id: user.id, name: user.name, email: user.email };
}

export async function changePassword(userId: string, current: string, next: string): Promise<void> {
  const record = await prisma.user.findUnique({ where: { id: userId } });
  if (!record) throw new Error('Account not found.');

  const ok = await compare(current, record.passwordHash);
  if (!ok) throw new Error('Your current password is not correct.');

  await prisma.user.update({
    where: { id: record.id },
    data: { passwordHash: await hash(next, 12) },
  });
}
