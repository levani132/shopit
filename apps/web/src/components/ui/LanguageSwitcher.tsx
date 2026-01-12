'use client';

import { useState, useEffect } from 'react';

interface LanguageSwitcherProps {
  /**
   * Variant for styling
   * - 'store': Uses store accent color for active state
   * - 'dark': Uses indigo color for dark backgrounds (like courier portal)
   */
  variant?: 'store' | 'dark';
}

export function LanguageSwitcher({ variant = 'store' }: LanguageSwitcherProps) {
  // Get current locale from URL path or cookie
  const [locale, setLocale] = useState<'en' | 'ka'>('ka'); // Default to Georgian (site default)

  useEffect(() => {
    // Try to detect locale from URL first
    const pathParts = window.location.pathname.split('/');
    for (const part of pathParts) {
      if (part === 'ka' || part === 'en') {
        setLocale(part);
        return;
      }
    }

    // If no locale in URL, check cookie
    const cookies = document.cookie.split(';');
    const localeCookie = cookies.find((c) =>
      c.trim().startsWith('NEXT_LOCALE='),
    );
    if (localeCookie) {
      const value = localeCookie.split('=')[1]?.trim() as 'en' | 'ka';
      if (value === 'en' || value === 'ka') {
        setLocale(value);
        return;
      }
    }

    // If no cookie, check html lang attribute (set by server)
    const htmlLang = document.documentElement.lang;
    if (htmlLang === 'ka' || htmlLang === 'en') {
      setLocale(htmlLang);
    }
  }, []);

  const switchLocale = (newLocale: 'en' | 'ka') => {
    if (newLocale === locale) return;

    // Set cookie for future visits
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;

    // Get current path
    const currentPath = window.location.pathname;

    // Check if locale is in the URL
    const hasLocaleInUrl =
      currentPath.includes('/en/') ||
      currentPath.includes('/ka/') ||
      currentPath === '/en' ||
      currentPath === '/ka' ||
      currentPath.endsWith('/en') ||
      currentPath.endsWith('/ka');

    if (hasLocaleInUrl) {
      // Replace locale in URL
      const newPath = currentPath
        .replace(/\/en(\/|$)/, `/${newLocale}$1`)
        .replace(/\/ka(\/|$)/, `/${newLocale}$1`);
      window.location.href = newPath + window.location.search;
    } else {
      // No locale in URL - add it
      // For root path, navigate to /[locale]/
      if (currentPath === '/' || currentPath === '') {
        window.location.href = `/${newLocale}/`;
      } else {
        // For other paths, prepend locale
        window.location.href = `/${newLocale}${currentPath}`;
      }
    }
  };

  // Styling based on variant
  const getActiveStyle = () => {
    if (variant === 'dark') {
      return { backgroundColor: '#6366f1' }; // indigo-500
    }
    return { backgroundColor: 'var(--store-accent-500)' };
  };

  const getContainerClass = () => {
    if (variant === 'dark') {
      return 'flex items-center gap-1 text-sm bg-white/10 rounded-lg p-1';
    }
    return 'flex items-center gap-1 text-sm bg-gray-100 dark:bg-zinc-800 rounded-lg p-1';
  };

  const getInactiveClass = () => {
    if (variant === 'dark') {
      return 'text-gray-300 hover:text-white';
    }
    return 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200';
  };

  return (
    <div className={getContainerClass()}>
      <button
        onClick={() => switchLocale('ka')}
        className={`px-2 py-1 rounded-md transition-all font-medium text-xs ${
          locale === 'ka' ? 'text-white shadow-sm' : getInactiveClass()
        }`}
        style={locale === 'ka' ? getActiveStyle() : undefined}
      >
        ქარ
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 rounded-md transition-all font-medium text-xs ${
          locale === 'en' ? 'text-white shadow-sm' : getInactiveClass()
        }`}
        style={locale === 'en' ? getActiveStyle() : undefined}
      >
        ENG
      </button>
    </div>
  );
}

