import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // List of all supported locales
  locales: ['ka', 'en'],

  // Default locale (Georgian)
  defaultLocale: 'ka',

  // Don't show default locale in URL
  localePrefix: 'as-needed',
});

// Lightweight wrappers around Next.js navigation APIs
// that handle the locale automatically
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
