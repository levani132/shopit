import { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// Cookie domain for cross-subdomain authentication.
// Leading dot allows all subdomains to share the cookie, e.g. cookies set on
// dev.shopit.ge are also sent on mystore.dev.shopit.ge — required for the
// owner-bypass on unpublished stores to work.
// In development we use .localhost so berso.localhost:3000 sees the cookie too.
const cookieDomain =
  process.env.COOKIE_DOMAIN || (isProduction ? '.shopit.ge' : '.localhost');

// SameSite setting:
// - 'lax': Works for same-site requests (including subdomains of same root domain)
//          Best compatibility with iOS Safari and incognito browsers
// - 'none': Required for true cross-origin (different domains), needs secure: true
// - 'strict': Most restrictive, blocks all cross-site requests
// Since api.shopit.ge and *.shopit.ge share the same root domain, 'lax' is correct
const sameSite = (process.env.COOKIE_SAME_SITE as 'lax' | 'none' | 'strict') || 'lax';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite,
  path: '/',
  // Set domain for cross-subdomain cookie sharing
  // Only set in production with proper domain configured
  ...(cookieDomain && { domain: cookieDomain }),
};

export const cookieConfig = {
  access: {
    name: 'access_token',
    options: {
      ...baseCookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour
    },
  },
  refresh: {
    name: 'refresh_token',
    options: {
      ...baseCookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  },
  session: {
    name: 'session_token',
    options: {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  },
};


