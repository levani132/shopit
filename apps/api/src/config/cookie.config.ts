import { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
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


