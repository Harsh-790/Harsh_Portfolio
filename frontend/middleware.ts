import { NextResponse, type NextRequest } from 'next/server';

/**
 * Early gate for the admin panel.
 *
 * The real authentication check lives in the Express API and in
 * requireAdmin() on every admin layout/page/action. This middleware only avoids
 * rendering the admin shell when the browser has no session cookie at all.
 * It deliberately contains no signing secret: a forged cookie may get past this
 * check, but it cannot get past the API, and no private data is fetched.
 */

const COOKIE_NAME = 'portfolio_session';
const LOGIN_PATH = '/admin/login';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isLogin = request.nextUrl.pathname === LOGIN_PATH;

  if (isLogin) return NextResponse.next();

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
