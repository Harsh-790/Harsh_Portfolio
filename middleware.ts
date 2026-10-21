import { NextResponse, type NextRequest } from 'next/server';
import { isMongoObjectId } from './lib/object-id';

/**
 * Early gate for the admin panel.
 *
 * Without this, an unauthenticated request to /admin/... still renders the page in
 * the RSC payload that ships with the redirect (Next renders layouts and pages in
 * parallel), so private data — message bodies, drafts — would end up in the response
 * body even though the browser immediately follows the redirect to the login page.
 * Middleware runs before rendering, so nothing is ever generated.
 *
 * The signature is verified here with WebCrypto (middleware runs on the edge
 * runtime); `requireAdmin()` in the panel layout and in every page is the real
 * gate, this is only there to keep unauthenticated renders from happening at all.
 */

const COOKIE_NAME = 'portfolio_session';
const LOGIN_PATH = '/admin/login';

function decodeBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hasValidSession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const signatureBytes = decodeBase64Url(signature);
  if (!signatureBytes) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    new TextEncoder().encode(payload),
  );
  if (!valid) return false;

  const payloadBytes = decodeBase64Url(payload);
  if (!payloadBytes) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(payloadBytes));
    return (
      isMongoObjectId(data?.uid) &&
      typeof data.exp === 'number' &&
      data.exp > Date.now()
    );
  } catch {
    return false;
  }
}

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? '';
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isLogin = request.nextUrl.pathname === LOGIN_PATH;

  // If the secret is missing we let the request through and lean on requireAdmin()
  // rather than locking the owner out of their own panel.
  if (secret.length < 16) return NextResponse.next();

  const authorized = await hasValidSession(token, secret);

  if (isLogin) {
    const response = NextResponse.next();
    // Clear a stale cookie when the login form is opened. Do not touch a login
    // POST: the server action sets the new session cookie on that same response.
    if (request.method === 'GET' && token && !authorized) clearSessionCookie(response);
    return response;
  }

  if (!authorized) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = '';
    const response = NextResponse.redirect(url);
    // Clear signatures that are expired, tampered with, or carry a pre-migration CUID.
    if (token) clearSessionCookie(response);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
