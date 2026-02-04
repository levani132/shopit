import { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// Cookie domain for cross-subdomain authentication
// Set COOKIE_DOMAIN=.shopit.ge in production to share cookies across:
// - api.shopit.ge (API)
// - soulart.shopit.ge (store)
// - techpoint.shopit.ge (store)
// - etc.
// The leading dot allows all subdomains to access the cookie
// In development, we use .localhost to share cookies across subdomains like berso.localhost:3000
const cookieDomain = process.env.COOKIE_DOMAIN || (!isProduction ? '.localhost' : undefined);

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


