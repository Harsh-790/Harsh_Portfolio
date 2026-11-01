import 'server-only';
import { cookies } from 'next/headers';

/**
 * Server-to-server client for the Express API.
 *
 * The browser only ever talks to this Next.js app. Server components, server
 * actions and the small media/Gullu proxies call the Express API with the
 * admin's HTTP-only session token. The backend URL is browser-safe and comes
 * from NEXT_PUBLIC_BACKEND_URL; the session token never reaches client code.
 */

export const SESSION_COOKIE = 'portfolio_session';

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

/** Keep backend failures from turning into an indefinite loading state. */
const REQUEST_TIMEOUT_MS = 12_000;

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

function withHeaders(init: RequestInit | undefined, token?: string | null): RequestInit {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers, cache: 'no-store' };
}

/** Low-level server-to-server request. Non-2xx responses are returned intact. */
export async function backendFetch(
  path: string,
  init?: RequestInit,
  token?: string | null,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const signal = init?.signal ?? AbortSignal.timeout(timeoutMs);

  try {
    return await fetch(`${BACKEND_URL}${path}`, {
      ...withHeaders(init, token),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      throw new ApiError(503, 'The backend is taking too long to respond. Please try again shortly.');
    }
    throw new ApiError(503, 'Backend is temporarily unavailable. Please try again shortly.');
  }
}

async function errorFrom(response: Response): Promise<ApiError> {
  let data: unknown = null;
  let message = `Backend request failed (${response.status}).`;
  try {
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      if (data && typeof data === 'object') {
        const record = data as Record<string, unknown>;
        if (typeof record.error === 'string') message = record.error;
        else if (typeof record.message === 'string') message = record.message;
      }
    }
  } catch {
    /* keep the generic message */
  }
  return new ApiError(response.status, message, data);
}

export async function backendJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await backendFetch(path, init);
  if (!response.ok) throw await errorFrom(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Authenticated JSON request used by server actions and admin pages. */
export async function adminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  if (!token) throw new ApiError(401, 'Please sign in again.');
  const response = await backendFetch(path, init, token);
  if (!response.ok) throw await errorFrom(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Authenticated raw response, used by the media proxy to preserve statuses. */
export async function adminBackendFetch(
  path: string,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<Response | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return backendFetch(path, init, token, timeoutMs);
}

export async function readApiError(error: unknown): Promise<{ message: string; data: unknown }> {
  if (error instanceof ApiError) return { message: error.message, data: error.data };
  return { message: error instanceof Error ? error.message : 'Something went wrong.', data: null };
}
