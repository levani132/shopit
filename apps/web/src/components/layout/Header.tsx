'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '../../i18n/routing';
import { useLocale } from 'next-intl';
import { useState } from 'react';

export function Header() {
  const t = useTranslations();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">SellIt</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('nav.home')}
            </Link>
            <a
              href="#how-it-works"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('nav.features')}
            </a>
            <a
              href="#featured-stores"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('nav.stores')}
            </a>
          </div>

          {/* Right side - Language switcher and CTA */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Auth buttons */}
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t('nav.login')}
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {t('common.startForFree')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
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
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.home')}
              </Link>
              <a
                href="#how-it-works"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.features')}
              </a>
              <a
                href="#featured-stores"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.stores')}
              </a>
              <hr className="border-gray-100" />
              <LanguageSwitcher />
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-center"
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
            ? 'bg-indigo-100 text-indigo-700 font-medium'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        {t('georgian')}
      </Link>
      <span className="text-gray-300">|</span>
      <Link
        href={pathname}
        locale="en"
        className={`px-2 py-1 rounded transition-colors ${
          locale === 'en'
            ? 'bg-indigo-100 text-indigo-700 font-medium'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        {t('english')}
      </Link>
    </div>
  );
}
