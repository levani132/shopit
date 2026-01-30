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
  'courier',
  'couriers',
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

// Store Brand Colors - Full Tailwind-style palette (50-900)
// These are the colors available when creating a store
export const STORE_BRAND_COLORS = {
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  black: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  },
} as const;

// Simplified version with just primary shades (500, 600, 700)
export const ACCENT_COLORS = {
  rose: { 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
  blue: { 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  green: { 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
  purple: { 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce' },
  orange: { 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
  indigo: { 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
  black: { 500: '#71717a', 600: '#52525b', 700: '#3f3f46' },
} as const;

export type AccentColorName = keyof typeof ACCENT_COLORS;
export type AccentColorShades = (typeof ACCENT_COLORS)[AccentColorName];
export type StoreBrandColorFullShades =
  (typeof STORE_BRAND_COLORS)[AccentColorName];

// Alias for backwards compatibility
export const ACCENT_COLORS_FULL = STORE_BRAND_COLORS;

// Main Site Accent Colors - Full palette for site-wide theming
export const MAIN_SITE_ACCENT_COLORS = {
  blue: {
    name: 'blue',
    hex: '#3b82f6',
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  indigo: {
    name: 'indigo',
    hex: '#6366f1',
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  pink: {
    name: 'pink',
    hex: '#ec4899',
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9f1239',
    900: '#831843',
  },
  emerald: {
    name: 'emerald',
    hex: '#10b981',
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  amber: {
    name: 'amber',
    hex: '#f59e0b',
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  purple: {
    name: 'purple',
    hex: '#a855f7',
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  red: {
    name: 'red',
    hex: '#ef4444',
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  teal: {
    name: 'teal',
    hex: '#14b8a6',
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
} as const;

export type MainSiteAccentColorName = keyof typeof MAIN_SITE_ACCENT_COLORS;

// Default accent colors
// Changed from indigo to blue for better cross-platform recognition and accessibility
export const DEFAULT_ACCENT_COLOR = ACCENT_COLORS.blue;
export const DEFAULT_ACCENT_COLOR_NAME: AccentColorName = 'blue';
// Changed from emerald to blue to align with new default branding
export const DEFAULT_MAIN_SITE_ACCENT = MAIN_SITE_ACCENT_COLORS.blue;

/**
 * Get store brand colors as CSS variable definitions (for use in style props)
 * @param colorName - The name of the accent color
 * @param prefix - CSS variable prefix (default: '--store-accent')
 * @returns Object with CSS variable names as keys and hex values
 */
export function getAccentColorCssVars(
  colorName: AccentColorName,
  prefix = '--store-accent',
): Record<string, string> {
  const colors = STORE_BRAND_COLORS[colorName] || STORE_BRAND_COLORS.indigo;
  return {
    [`${prefix}-50`]: colors[50],
    [`${prefix}-100`]: colors[100],
    [`${prefix}-200`]: colors[200],
    [`${prefix}-300`]: colors[300],
    [`${prefix}-400`]: colors[400],
    [`${prefix}-500`]: colors[500],
    [`${prefix}-600`]: colors[600],
    [`${prefix}-700`]: colors[700],
    [`${prefix}-800`]: colors[800],
    [`${prefix}-900`]: colors[900],
  };
}

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
