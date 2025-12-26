import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

// Cookie name for storing user's locale preference (next-intl uses this)
const LOCALE_COOKIE = 'NEXT_LOCALE';

// Georgia country code
const GEORGIA_COUNTRY_CODE = 'GE';

// Main domains that should NOT be treated as store subdomains
const MAIN_DOMAINS = [
  'localhost',
  'shopit.ge',
  'www.shopit.ge',
  'shopit.com',
  'www.shopit.com',
];

// Create middleware with locale detection enabled
const intlMiddleware = createMiddleware(routing);

/**
 * Extract subdomain from hostname
 * e.g., "sample.localhost" -> "sample"
 * e.g., "mystore.shopit.ge" -> "mystore"
 * e.g., "localhost" -> null (main site)
 */
function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Check if it's a main domain (no subdomain)
  if (MAIN_DOMAINS.includes(host)) {
    return null;
  }

  // For localhost subdomains (e.g., sample.localhost)
  if (host.endsWith('.localhost')) {
    return host.replace('.localhost', '');
  }

  // For production domains (e.g., mystore.shopit.ge)
  const parts = host.split('.');
  if (parts.length >= 3) {
    // e.g., ["mystore", "shopit", "ge"]
    return parts[0];
  }

  // For two-part domains that aren't in MAIN_DOMAINS, treat first part as subdomain
  // e.g., mystore.shopit.local -> mystore
  if (parts.length === 2 && !MAIN_DOMAINS.includes(host)) {
    return parts[0];
  }

  return null;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Check for subdomain (seller store)
  const subdomain = getSubdomain(hostname);

  if (subdomain) {
    // This is a store subdomain - rewrite to the store page
    const url = request.nextUrl.clone();

    // Handle locale in the store path
    const pathnameHasLocale = routing.locales.some(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    );

    if (pathnameHasLocale) {
      // e.g., /en/products -> /store/sample/en/products
      const locale = pathname.split('/')[1];
      const restPath = pathname.replace(`/${locale}`, '') || '/';
      url.pathname = `/store/${subdomain}/${locale}${restPath}`;
    } else {
      // No locale in path - add default locale
      // e.g., / -> /store/sample/en
      // e.g., /products -> /store/sample/en/products
      const defaultLocale = routing.defaultLocale;
      const normalizedPath = pathname === '/' ? '' : pathname;
      url.pathname = `/store/${subdomain}/${defaultLocale}${normalizedPath}`;
    }

    // Rewrite (not redirect) so the URL stays the same in browser
    return NextResponse.rewrite(url);
  }

  // ---- Main site logic (no subdomain) ----

  // Early return for files with extensions (e.g., .js, .json, .png, etc.)
  // This prevents service workers and other static files from being treated as locales
  if (pathname.includes('.') && !pathname.startsWith('/_next')) {
    const lastSegment = pathname.split('/').pop() || '';
    if (lastSegment.includes('.')) {
      return new Response(null, { status: 404 });
    }
  }

  // Check if locale is already in the URL (e.g., /en/... or /ka/...)
  const pathnameHasLocale = routing.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  // If user manually navigated to a locale URL, let next-intl handle it
  // (it will save the preference automatically)
  if (pathnameHasLocale) {
    return intlMiddleware(request);
  }

  // Check if user has a saved locale preference
  const savedLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  // If user has a saved preference, use it
  if (
    savedLocale &&
    routing.locales.includes(savedLocale as (typeof routing.locales)[number])
  ) {
    return intlMiddleware(request);
  }

  // Check if user is in Georgia
  // Vercel provides country code in header, or we can use Cloudflare headers
  const countryCode =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry');

  // If user is in Georgia, default to Georgian (ka)
  if (countryCode === GEORGIA_COUNTRY_CODE) {
    // Redirect to Georgian locale or set cookie
    const response = intlMiddleware(request);

    // Ensure Georgian locale is set in cookie for future visits
    if (!savedLocale || savedLocale !== 'ka') {
      response.cookies.set(LOCALE_COOKIE, 'ka', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
      });
    }

    return response;
  }

  // For users outside Georgia, use browser language detection
  // next-intl will automatically detect and redirect based on Accept-Language header
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for
  // - api routes
  // - _next (Next.js internals)
  // - static files (images, fonts, etc.)
  // - service worker files (sw.js, sw-new.js, etc.)
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - files with extensions (e.g., .js, .json, .png, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
