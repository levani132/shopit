'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '../../i18n/routing';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';

export function Header() {
  const t = useTranslations();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">SellIt</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t('nav.home')}
            </Link>
            <a
              href="#how-it-works"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t('nav.features')}
            </a>
            <a
              href="#featured-stores"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t('nav.stores')}
            </a>
          </div>

          {/* Right side - Language switcher and CTA */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Auth buttons */}
            <Link
              href="/"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t('nav.login')}
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors font-medium"
            >
              {t('common.startForFree')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 dark:border-zinc-800">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.home')}
              </Link>
              <a
                href="#how-it-works"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.features')}
              </a>
              <a
                href="#featured-stores"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.stores')}
              </a>
              <hr className="border-gray-100 dark:border-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Theme</span>
                <button
                  onClick={toggleTheme}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
              </div>
              <LanguageSwitcher />
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors font-medium text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('common.startForFree')}
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

function LanguageSwitcher() {
  const t = useTranslations('common');
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href={pathname}
        locale="ka"
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'ka'
            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        {t('georgian')}
      </Link>
      <span className="text-gray-300 dark:text-gray-600">|</span>
      <Link
        href={pathname}
        locale="en"
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'en'
            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        {t('english')}
      </Link>
    </div>
  );
}
