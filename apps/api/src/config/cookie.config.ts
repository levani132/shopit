import { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// When using a proxy (same-origin), we can use 'lax' for better compatibility
// When cross-origin, we need 'none' with secure: true
// Set COOKIE_SAME_SITE=lax when using a proxy, or leave default for cross-origin
const sameSite = process.env.COOKIE_SAME_SITE as 'lax' | 'none' | 'strict' | undefined;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  // Default: 'none' for cross-origin in production (requires secure: true)
  // Use 'lax' when proxying through same origin for better incognito support
  sameSite: sameSite || (isProduction ? 'none' : 'lax'),
  path: '/',
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


