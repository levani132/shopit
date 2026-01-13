import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

// Cookie name for storing user's locale preference (next-intl uses this)
const LOCALE_COOKIE = 'NEXT_LOCALE';

// Main domains that should NOT be treated as store subdomains
const MAIN_DOMAINS = [
  'localhost',
  'shopit.ge',
  'www.shopit.ge',
  'shopit.com',
  'www.shopit.com',
  'shopit-dev.vercel.app',
];

// API base URL for checking store status
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Cache store status for a short time to avoid repeated API calls
// Note: We cache per subdomain+cookie hash to allow different results for logged-in users
const storeStatusCache = new Map<
  string,
  { publishStatus: string; canBypass: boolean; expires: number }
>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Create middleware with locale detection enabled
const intlMiddleware = createMiddleware(routing);

/**
 * Extract subdomain from hostname
 * e.g., "sample.localhost" -> "sample"
 * e.g., "mystore.shopit.ge" -> "mystore"
 * e.g., "localhost" -> null (main site)
 */
/**
 * Check if a store is published and if user can bypass the publish check
 * Returns the publish status and bypass permission
 */
async function getStorePublishStatus(
  subdomain: string,
  cookieHeader?: string,
): Promise<{ publishStatus: string | null; canBypass: boolean }> {
  // Create a cache key that includes cookie presence for auth-aware caching
  const hasAuth = cookieHeader?.includes('access_token');
  const cacheKey = `${subdomain}:${hasAuth ? 'auth' : 'anon'}`;

  console.log('[Middleware] getStorePublishStatus:', {
    subdomain,
    hasAuth,
    cacheKey,
    hasCookieHeader: !!cookieHeader,
  });

  // Check cache first
  const cached = storeStatusCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    console.log('[Middleware] Using cached result:', cached);
    return { publishStatus: cached.publishStatus, canBypass: cached.canBypass };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward cookies to the API for authentication
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    console.log('[Middleware] Fetching store status from API:', {
      url: `${API_BASE_URL}/stores/subdomain/${subdomain}/status`,
      hasCookies: !!headers['Cookie'],
    });

    const response = await fetch(
      `${API_BASE_URL}/stores/subdomain/${subdomain}/status`,
      {
        method: 'GET',
        headers,
        // Don't cache this request in fetch layer
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      console.log('[Middleware] API returned error:', response.status);
      // Store not found
      storeStatusCache.set(cacheKey, {
        publishStatus: 'not_found',
        canBypass: false,
        expires: Date.now() + CACHE_TTL,
      });
      return { publishStatus: null, canBypass: false };
    }

    const data = await response.json();
    const publishStatus = data.publishStatus || 'draft';
    const canBypass = data.canBypassPublishStatus || false;

    console.log('[Middleware] API response:', {
      publishStatus,
      canBypass,
      rawCanBypass: data.canBypassPublishStatus,
    });

    // Cache the result
    storeStatusCache.set(cacheKey, {
      publishStatus,
      canBypass,
      expires: Date.now() + CACHE_TTL,
    });

    return { publishStatus, canBypass };
  } catch (error) {
    console.error('[Middleware] Error checking store status:', error);
    // On error, allow access (fail open)
    return { publishStatus: 'published', canBypass: false };
  }
}

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

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // === DEBUG: Log locale detection info ===
  const acceptLanguage = request.headers.get('accept-language');
  const countryCodeVercel = request.headers.get('x-vercel-ip-country');
  const countryCodeCF = request.headers.get('cf-ipcountry');
  const savedLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  console.log('[Middleware] Locale detection:', {
    pathname,
    hostname,
    savedLocale,
    countryCodeVercel,
    countryCodeCF,
    acceptLanguage: acceptLanguage?.substring(0, 100), // Truncate for readability
    hasLocaleInPath: routing.locales.some(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    ),
  });
  // === END DEBUG ===

  // Check for subdomain (seller store or special portals)
  const subdomain = getSubdomain(hostname);

  // Special handling for courier portal
  if (subdomain === 'couriers') {
    const url = request.nextUrl.clone();

    // Handle locale in the courier portal path
    const pathnameHasLocale = routing.locales.some(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    );

    if (pathnameHasLocale) {
      const locale = pathname.split('/')[1];
      const restPath = pathname.replace(`/${locale}`, '') || '/';
      url.pathname = `/couriers/${locale}${restPath}`;
    } else {
      const defaultLocale = routing.defaultLocale;
      const normalizedPath = pathname === '/' ? '' : pathname;
      url.pathname = `/couriers/${defaultLocale}${normalizedPath}`;
    }

    const response = NextResponse.rewrite(url);
    response.headers.set('x-pathname', pathname);
    return response;
  }

  if (subdomain) {
    // Get cookies from request to forward to API for auth check
    const cookieHeader = request.headers.get('cookie') || undefined;

    // Check if store is published before allowing access
    const { publishStatus, canBypass } = await getStorePublishStatus(
      subdomain,
      cookieHeader,
    );

    // If store not found or not published (and user can't bypass), show appropriate page
    if (!publishStatus || (publishStatus !== 'published' && !canBypass)) {
      const url = request.nextUrl.clone();
      const pathnameHasLocale = routing.locales.some(
        (locale) =>
          pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
      );
      const locale = pathnameHasLocale
        ? pathname.split('/')[1]
        : routing.defaultLocale;

      // Rewrite to coming-soon page for the store
      if (publishStatus === 'pending_review') {
        url.pathname = `/store/${subdomain}/${locale}/coming-soon`;
      } else {
        // Store not found or draft - show 404
        url.pathname = `/store/${subdomain}/${locale}/not-found`;
      }

      const response = NextResponse.rewrite(url);
      response.headers.set('x-store-status', publishStatus || 'not_found');
      return response;
    }

    // This is a store subdomain - rewrite to the store page
    const url = request.nextUrl.clone();

    // Handle locale in the store path
    const pathnameHasLocale = routing.locales.some(
      (locale) =>
        pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    );

    let originalPath = pathname;
    if (pathnameHasLocale) {
      // e.g., /en/products -> /store/sample/en/products
      const locale = pathname.split('/')[1];
      const restPath = pathname.replace(`/${locale}`, '') || '/';
      originalPath = restPath;
      url.pathname = `/store/${subdomain}/${locale}${restPath}`;
    } else {
      // No locale in path - add default locale
      // e.g., / -> /store/sample/en
      // e.g., /products -> /store/sample/en/products
      const defaultLocale = routing.defaultLocale;
      const normalizedPath = pathname === '/' ? '' : pathname;
      originalPath = normalizedPath || '/';
      url.pathname = `/store/${subdomain}/${defaultLocale}${normalizedPath}`;
    }

    // Rewrite (not redirect) so the URL stays the same in browser
    // Pass the original pathname as a header for layout detection
    const response = NextResponse.rewrite(url);
    response.headers.set('x-pathname', originalPath);
    return response;
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
  const savedLocaleCookie = request.cookies.get(LOCALE_COOKIE)?.value;

  // If user has a saved preference, use it
  if (
    savedLocaleCookie &&
    routing.locales.includes(
      savedLocaleCookie as (typeof routing.locales)[number],
    )
  ) {
    console.log(
      '[Middleware] Using saved locale preference:',
      savedLocaleCookie,
    );
    return intlMiddleware(request);
  }

  // Check country from various headers
  // Vercel provides x-vercel-ip-country, Cloudflare provides cf-ipcountry
  const countryCode =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry');

  console.log('[Middleware] Country detection:', { countryCode });

  // STRATEGY: Default to Georgian (ka) unless we KNOW the user is outside Georgia
  // This is because the target audience is Georgian, and geo-detection is unreliable

  // Countries that should default to English (major English-speaking countries)
  const ENGLISH_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'ZA'];

  // If we can detect the country and it's a known English-speaking country, use English
  if (countryCode && ENGLISH_COUNTRIES.includes(countryCode)) {
    console.log(
      '[Middleware] Detected English-speaking country, using browser preference',
    );
    return intlMiddleware(request);
  }

  // For Georgia OR unknown country (including when geo-detection fails),
  // default to Georgian
  console.log('[Middleware] Defaulting to Georgian (GE or unknown country)');

  // Create a redirect to Georgian locale
  const url = request.nextUrl.clone();
  url.pathname = `/ka${pathname === '/' ? '' : pathname}`;

  const response = NextResponse.redirect(url);

  // Set cookie so future visits remember Georgian
  response.cookies.set(LOCALE_COOKIE, 'ka', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });

  return response;
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
