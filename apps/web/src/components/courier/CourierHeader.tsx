'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, hasRole, Role } from '../../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { ShopItBar } from '../ui/ShopItBar';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

export function CourierHeader() {
  const t = useTranslations('courier');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { isAuthenticated, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [topBarVisible, setTopBarVisible] = useState(true);

  const isCourier = hasRole(user?.role ?? 0, Role.COURIER);

  // Handle scroll behavior - hide top bar on scroll (like StoreHeader)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide top bar after scrolling down 50px
      if (currentScrollY > 50) {
        setTopBarVisible(false);
      } else {
        setTopBarVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Small Top Bar - ShopIt global bar, hides on scroll (collapses height like StoreHeader) */}
      <div
        className={`transition-all duration-300 ${
          topBarVisible ? 'h-10 opacity-100' : 'h-0 opacity-0 overflow-hidden'
        }`}
      >
        <ShopItBar variant="store" showCreateShop={false} />
      </div>

      {/* Main Courier Header - Sticky, always on top */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - links to courier home (no /couriers prefix, middleware handles it) */}
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">
                ShopIt <span className="text-indigo-400">Couriers</span>
              </span>
            </Link>

            {/* Right side - Nav + Theme + Language */}
            <div className="flex items-center gap-3">
              {/* Navigation buttons */}
              {isAuthenticated && isCourier ? (
                <Link
                  href={`/${locale}/dashboard`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {t('goToDashboard')}
                </Link>
              ) : isAuthenticated ? (
                <Link
                  href={`/${locale}/apply`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {t('applyNow')}
                </Link>
              ) : null}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label={
                  theme === 'dark'
                    ? 'Switch to light mode'
                    : 'Switch to dark mode'
                }
              >
                {theme === 'dark' ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>

              {/* Language Switcher - uses same component as store pages */}
              <LanguageSwitcher variant="dark" />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
