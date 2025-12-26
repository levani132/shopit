/**
 * Application-wide constants
 */

// Platform info
export const APP_NAME = 'ShopIt';
export const APP_DESCRIPTION = 'Create your own online store in minutes';
export const APP_VERSION = '1.0.0';

// Subdomain settings
export const SUBDOMAIN_MIN_LENGTH = 3;
export const SUBDOMAIN_MAX_LENGTH = 63;
export const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'admin',
  'dashboard',
  'app',
  'mail',
  'ftp',
  'smtp',
  'pop',
  'imap',
  'blog',
  'shop',
  'store',
  'support',
  'help',
  'docs',
  'status',
  'cdn',
  'static',
  'assets',
  'images',
  'media',
  'auth',
  'login',
  'register',
  'signup',
  'signin',
  'account',
  'profile',
  'settings',
  'billing',
  'payment',
  'checkout',
] as const;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload limits
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

// Product limits
export const MAX_PRODUCT_IMAGES = 10;
export const MAX_PRODUCT_NAME_LENGTH = 200;
export const MAX_PRODUCT_DESCRIPTION_LENGTH = 5000;

// Post limits
export const MAX_POST_IMAGES = 10;
export const MAX_POST_CONTENT_LENGTH = 2000;
export const MAX_COMMENT_LENGTH = 500;

// Store limits
export const MAX_CATEGORIES_PER_STORE = 50;
export const MAX_SUBCATEGORIES_PER_CATEGORY = 20;
export const MAX_PRODUCTS_PER_STORE = 10000;

// Default colors
export const DEFAULT_ACCENT_COLOR = '#6366f1'; // Indigo

// Routes
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  POSTS: '/posts',
  INFO: '/info',
  PRODUCT_DETAIL: (id: string) => `/products/${id}`,
  CATEGORY: (slug: string) => `/products?category=${slug}`,
  POST_DETAIL: (id: string) => `/posts/${id}`,
} as const;

// API Routes
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  STORES: '/stores',
  PRODUCTS: '/products',
  CATEGORIES: '/categories',
  POSTS: '/posts',
  INFO: '/info',
  UPLOAD: '/upload',
} as const;
