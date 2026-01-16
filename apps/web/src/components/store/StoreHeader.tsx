'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from '../theme/ThemeProvider';
import { ShopItBar } from '../ui/ShopItBar';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { CartButton } from './CartButton';
import { useAuth } from '../../contexts/AuthContext';
import { Role, hasRole } from '@sellit/constants';
import { getLatinInitial } from '../../lib/utils';
import { getMainSiteUrl } from '../../utils/subdomain';
import Link from 'next/link';

interface SubcategoryData {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  slug: string;
}

interface CategoryData {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  slug: string;
  subcategories: SubcategoryData[];
}

interface StoreHeaderProps {
  store: {
    name: string;
    subdomain?: string;
    description?: string;
    logo?: string;
    authorName?: string;
    showAuthorName?: boolean;
    categories?: CategoryData[];
    initial?: string; // Pre-computed English initial for avatar display
  };
}

export function StoreHeader({ store }: StoreHeaderProps) {
  const t = useTranslations('store');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [topBarVisible, setTopBarVisible] = useState(true);
  const [mainSiteUrl, setMainSiteUrl] = useState('');
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  // Get categories with localized names
  const categories = store.categories || [];
  const hasCategories = categories.length > 0;

  // Get localized category name
  const getCategoryName = (cat: CategoryData) => {
    if (cat.nameLocalized) {
      return (
        (locale === 'ka' ? cat.nameLocalized.ka : cat.nameLocalized.en) ||
        cat.name
      );
    }
    return cat.name;
  };

  // Get localized subcategory name
  const getSubcategoryName = (sub: SubcategoryData) => {
    if (sub.nameLocalized) {
      return (
        (locale === 'ka' ? sub.nameLocalized.ka : sub.nameLocalized.en) ||
        sub.name
      );
    }
    return sub.name;
  };

  // Close categories dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target as Node)
      ) {
        setCategoriesOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get main site URL on client side
  useEffect(() => {
    setMainSiteUrl(getMainSiteUrl());
  }, []);

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
      {/* Small Top Bar - ShopIt global bar, hides on scroll */}
      <div
        className={`transition-all duration-300 ${
          topBarVisible ? 'h-10 opacity-100' : 'h-0 opacity-0 overflow-hidden'
        }`}
      >
        <ShopItBar variant="store" showCreateShop />
      </div>

      {/* Main Store Header - Sticky */}
      <header
        className={`bg-white dark:bg-zinc-900 shadow-sm z-50 transition-all duration-300 ${
          topBarVisible ? 'sticky top-0' : 'sticky top-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo / Store Name - Clickable to homepage */}
            <a
              href="/"
              className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity"
            >
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
                  {store.initial || getLatinInitial(store.name)}
                </div>
              )}
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {store.name}
              </span>
            </a>

            {/* Desktop Navigation - Positioned after logo with gap */}
            <nav className="hidden md:flex items-center gap-6 ml-10">
              {/* Categories Dropdown - Only show if has categories */}
              {hasCategories && (
                <div
                  ref={categoriesRef}
                  className="relative"
                  onMouseEnter={() => setCategoriesOpen(true)}
                  onMouseLeave={() => setCategoriesOpen(false)}
                >
                  <button
                    className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors py-2"
                    onClick={() => setCategoriesOpen(!categoriesOpen)}
                  >
                    {t('categories')}
                    <svg
                      className={`w-4 h-4 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu - pt-2 creates visual gap, but no actual gap in hover area */}
                  {categoriesOpen && (
                    <div className="absolute left-0 top-full w-64 pt-2 z-50">
                      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 py-2">
                        {categories.map((category) => (
                          <div key={category._id}>
                            <a
                              href={`/${locale}/products?category=${category._id}`}
                              className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 font-medium"
                            >
                              {getCategoryName(category)}
                            </a>
                            {/* Subcategories */}
                            {category.subcategories.length > 0 && (
                              <div className="ml-4 border-l border-gray-200 dark:border-zinc-700">
                                {category.subcategories.map((sub) => (
                                  <a
                                    key={sub._id}
                                    href={`/${locale}/products?category=${category._id}&subcategory=${sub._id}`}
                                    className="block px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white"
                                  >
                                    {getSubcategoryName(sub)}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <a
                href={`/${locale}/products`}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('products')}
              </a>

              <a
                href="#about"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('aboutUs')}
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
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Wishlist - for logged in users */}
              {isAuthenticated && (
                <Link
                  href={`/${locale}/wishlist`}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 hidden sm:block"
                  title={t('wishlist')}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </Link>
              )}

              {/* Orders - for logged in users */}
              {isAuthenticated && (
                <Link
                  href={`/${locale}/orders`}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 hidden sm:block"
                  title={t('myOrders')}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </Link>
              )}

              {/* Cart Button */}
              <CartButton />

              {/* Login button (when not logged in) - visible when top bar is hidden */}
              {!isAuthenticated && !authLoading && (
                <a
                  href="/login"
                  className="hidden md:flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--store-accent-500)' }}
                >
                  {t('login')}
                </a>
              )}

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
            <MobileNav
              isAuthenticated={isAuthenticated}
              user={user}
              mainSiteUrl={mainSiteUrl}
              locale={locale}
              categories={categories}
              onClose={() => setIsMenuOpen(false)}
            />
          )}
        </div>
      </header>
    </>
  );
}

interface MobileNavProps {
  isAuthenticated: boolean;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: number;
  } | null;
  mainSiteUrl: string;
  locale: string;
  categories: CategoryData[];
  onClose: () => void;
}

function MobileNav({
  isAuthenticated,
  user,
  mainSiteUrl,
  locale,
  categories,
  onClose,
}: MobileNavProps) {
  const t = useTranslations('store');
  const { logout } = useAuth();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const isSeller = hasRole(user?.role ?? 0, Role.SELLER);
  const hasCategories = categories.length > 0;

  // Get localized category name
  const getCategoryName = (cat: CategoryData) => {
    if (cat.nameLocalized) {
      return (
        (locale === 'ka' ? cat.nameLocalized.ka : cat.nameLocalized.en) ||
        cat.name
      );
    }
    return cat.name;
  };

  // Get localized subcategory name
  const getSubcategoryName = (sub: SubcategoryData) => {
    if (sub.nameLocalized) {
      return (
        (locale === 'ka' ? sub.nameLocalized.ka : sub.nameLocalized.en) ||
        sub.name
      );
    }
    return sub.name;
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <nav className="md:hidden py-4 border-t border-gray-100 dark:border-zinc-800">
      <div className="flex flex-col gap-4">
        {/* Navigation Links */}
        <a
          href={`/${locale}/products`}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={onClose}
        >
          {t('products')}
        </a>

        {/* Categories - Only show if has categories */}
        {hasCategories && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() =>
                setExpandedCategory(expandedCategory ? null : 'all')
              }
              className="flex items-center justify-between text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {t('categories')}
              <svg
                className={`w-4 h-4 transition-transform ${expandedCategory ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Expanded categories list */}
            {expandedCategory && (
              <div
                className="ml-4 flex flex-col gap-2 border-l-2 pl-4"
                style={{ borderColor: 'var(--store-accent-200)' }}
              >
                {categories.map((category) => (
                  <div key={category._id}>
                    <a
                      href={`/${locale}/products?category=${category._id}`}
                      className="block text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
                      onClick={onClose}
                    >
                      {getCategoryName(category)}
                    </a>
                    {/* Subcategories */}
                    {category.subcategories.length > 0 && (
                      <div className="ml-3 mt-1 flex flex-col gap-1">
                        {category.subcategories.map((sub) => (
                          <a
                            key={sub._id}
                            href={`/${locale}/products?category=${category._id}&subcategory=${sub._id}`}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                            onClick={onClose}
                          >
                            {getSubcategoryName(sub)}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <a
          href="#about"
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={onClose}
        >
          {t('aboutUs')}
        </a>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-zinc-700" />

        {isAuthenticated && user ? (
          <>
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: 'var(--store-accent-500)' }}
              >
                {getLatinInitial(user.firstName || user.email)}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              </div>
            </div>

            {/* User Menu Items */}
            <a
              href="/profile"
              className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={onClose}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {t('myProfile')}
            </a>
            <a
              href="/orders"
              className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={onClose}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              {t('myOrders')}
            </a>
            <a
              href="/wishlist"
              className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={onClose}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {t('wishlist')}
            </a>

            {/* Seller Dashboard Link */}
            {isSeller && (
              <a
                href={`${mainSiteUrl}/${locale}/dashboard`}
                className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={onClose}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
                {t('sellerDashboard')}
              </a>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {t('signOut')}
            </button>
          </>
        ) : (
          <>
            {/* Login/Register for guests */}
            <a
              href="/login"
              className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={onClose}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              {t('login')}
            </a>
            <a
              href="/register"
              className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={onClose}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              {t('register')}
            </a>
            <a
              href={`${mainSiteUrl}/register`}
              className="flex items-center gap-3 font-medium transition-colors"
              style={{ color: 'var(--store-accent-600)' }}
              onClick={onClose}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {t('createYourShop')}
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
