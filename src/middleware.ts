import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware for route protection.
 *
 * Public routes:    /authenticate, /showcase, /_next, /api, /
 * Protected routes: /dashboard and all (gbp) pages
 *
 * Strategy: check for the `auth_session` cookie (written by AppProvider on login).
 * If missing on a protected route → redirect to /authenticate.
 * If present on /authenticate → redirect to /dashboard (already logged in).
 */

const PUBLIC_PATHS = ['/', '/authenticate', '/showcase'];
const PUBLIC_PREFIXES = ['/_next', '/api', '/favicon', '/robots'];

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/overview',
  '/reviews',
  '/posts',
  '/keywords',
  '/search-rankings',
  '/competitors',
  '/collage',
  '/profile',
  '/locations',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get('auth_session')?.value;
  const isLoggedIn = !!authCookie;

  // Already authenticated → skip the login page
  if (pathname === '/authenticate' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protected route without session → send to login
  if (isProtectedPath(pathname) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/authenticate', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
