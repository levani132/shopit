import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // List of all supported locales
  locales: ['ka', 'en'],

  // Default locale (Georgian)
  defaultLocale: 'ka',

  // Don't show default locale in URL
  localePrefix: 'as-needed',

  // Disable automatic locale detection based on Accept-Language header
  // We handle this manually in middleware to default to Georgian
  localeDetection: false,
});

// Lightweight wrappers around Next.js navigation APIs
// that handle the locale automatically
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
