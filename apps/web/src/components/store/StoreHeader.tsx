'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { ShopItLogo } from '../ui/ShopItLogo';

// Main site URL for links back to ShopIt
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://shopit.ge';

interface StoreHeaderProps {
  store: {
    name: string;
    subdomain?: string;
    description?: string;
    logo?: string;
    authorName?: string;
    showAuthorName?: boolean;
  };
}

export function StoreHeader({ store }: StoreHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount] = useState(0);
  const [topBarVisible, setTopBarVisible] = useState(true);
  const { theme, toggleTheme } = useTheme();

  // Handle scroll to hide/show top bar
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
      {/* Small Top Bar - Hides on scroll */}
      <div
        className={`bg-gray-900 dark:bg-zinc-950 text-white transition-all duration-300 ${
          topBarVisible ? 'h-10 opacity-100' : 'h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* ShopIt Logo */}
            <a href={MAIN_SITE_URL} className="flex items-center">
              <ShopItLogo size="sm" variant="light" useStoreAccent />
            </a>

            {/* Right side buttons */}
            <div className="flex items-center gap-3">
              <a
                href={`${MAIN_SITE_URL}/login`}
                className="text-xs text-gray-300 hover:text-white transition-colors"
              >
                Login
              </a>
              <a
                href={`${MAIN_SITE_URL}/register`}
                className="text-xs text-gray-300 hover:text-white transition-colors"
              >
                Register
              </a>
              <a
                href={`${MAIN_SITE_URL}/register`}
                className="text-xs px-3 py-1 rounded-full text-white transition-colors"
                style={{ backgroundColor: 'var(--store-accent-500)' }}
              >
                Create Your Shop
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Store Header - Sticky */}
      <header
        className={`bg-white dark:bg-zinc-900 shadow-sm z-50 transition-all duration-300 ${
          topBarVisible ? 'sticky top-0' : 'sticky top-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo / Store Name */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: 'var(--store-accent-500)' }}
                >
                  {store.name.charAt(0)}
                </div>
              )}
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {store.name}
              </span>
            </div>

            {/* Desktop Navigation - Positioned after logo with gap */}
            <nav className="hidden md:flex items-center gap-6 ml-10">
              <a
                href="#products"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Products
              </a>
              <a
                href="#categories"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Categories
              </a>
              <a
                href="#about"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                About
              </a>
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side - Theme, Language, Cart */}
            <div className="flex items-center gap-2">
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

              {/* Cart Button */}
              <button
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Shopping cart"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 text-xs text-white rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--store-accent-500)' }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMenuOpen ? (
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
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <nav className="md:hidden py-4 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex flex-col gap-4">
                <a
                  href="#products"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Products
                </a>
                <a
                  href="#categories"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Categories
                </a>
                <a
                  href="#about"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </a>
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}

function LanguageSwitcher() {
  // Get current locale from cookie or default
  const [locale, setLocale] = useState<'en' | 'ka'>('en');

  useEffect(() => {
    // Read locale from cookie
    const cookies = document.cookie.split(';');
    const localeCookie = cookies.find(c => c.trim().startsWith('NEXT_LOCALE='));
    if (localeCookie) {
      const value = localeCookie.split('=')[1] as 'en' | 'ka';
      if (value === 'en' || value === 'ka') {
        setLocale(value);
      }
    }
  }, []);

  const switchLocale = (newLocale: 'en' | 'ka') => {
    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLocale(newLocale);
    // Reload to apply new locale
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
      <button
        onClick={() => switchLocale('ka')}
        className={`px-2 py-1 rounded-md transition-all font-medium text-xs ${
          locale === 'ka'
            ? 'text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        style={locale === 'ka' ? { backgroundColor: 'var(--store-accent-500)' } : undefined}
      >
        ქარ
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 rounded-md transition-all font-medium text-xs ${
          locale === 'en'
            ? 'text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        style={locale === 'en' ? { backgroundColor: 'var(--store-accent-500)' } : undefined}
      >
        ENG
      </button>
    </div>
  );
}
