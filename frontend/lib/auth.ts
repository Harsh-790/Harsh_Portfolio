import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError, SESSION_COOKIE, backendJson, getSessionToken } from './api';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export { SESSION_COOKIE };

export type SessionUser = { id: string; name: string; email: string };

/**
 * The admin session is a signed token minted by the Express API and kept in an
 * HTTP-only cookie. It is verified by the backend on every admin request.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const data = await backendJson<{ user: SessionUser }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) return null;
    throw error;
  }
}

/** Used by every admin page and admin server action. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');
  return user;
}

export async function startSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
