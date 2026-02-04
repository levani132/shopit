'use client';

import { useState } from 'react';
import { usePathname as useNextPathname } from 'next/navigation';
import { Link, usePathname } from '../../i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { ShopItLogo } from '../ui/ShopItLogo';
import { UserMenuDropdown } from '../ui/UserMenuDropdown';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import {
  Role,
  RoleValue,
  hasRole,
  hasAnyRole,
  getAccentColorCssVars,
  AccentColorName,
} from '@shopit/constants';
import { getStoreUrl } from '../../utils/subdomain';
import PublishButton from './PublishButton';
import { NAV_SECTIONS } from './DashboardSidebar';

export function DashboardHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = useNextPathname();
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const tNav = useTranslations('nav');
  const { theme, toggleTheme } = useTheme();
  const { user, store, logout } = useAuth();

  // Get accent colors for mobile menu (to ensure they work in fixed position)
  const brandColor = (store?.brandColor || 'indigo') as AccentColorName;
  const accentColors = getAccentColorCssVars(brandColor, '--accent');

  // Debug log
  console.log(
    '[DashboardHeader] brandColor:',
    brandColor,
    'accentColors:',
    accentColors,
  );

  // Get user role, default to 'user' if not set
  const userRole = (user?.role as RoleValue) || Role.USER;

  // Check if a section/item should be shown for the current user role (bitmask)
  const shouldShowForRole = (roles?: RoleValue[]) => {
    if (!roles || roles.length === 0) return true; // No role restriction
    return hasAnyRole(userRole, roles);
  };

  // Filter sections and items based on role
  const filteredSections = NAV_SECTIONS.filter((section) =>
    shouldShowForRole(section.roles),
  )
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => shouldShowForRole(item.roles)),
    }))
    .filter((section) => section.items.length > 0);

  const isActive = (href: string) => {
    // pathname may or may not have locale prefix, handle both cases
    // Locale format: /ka/... or /en/... (2-letter code)
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');
    const result =
      href === '/dashboard'
        ? pathWithoutLocale === '/dashboard'
        : pathWithoutLocale.startsWith(href);

    // Debug log
    if (isMenuOpen) {
      console.log('[isActive]', { href, pathname, pathWithoutLocale, result });
    }

    return result;
  };

  const handleLogout = async () => {
    await logout();
  };

  // Get user initials - still needed for mobile menu
  const getUserInitials = () => {
    if (!user) return 'U';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (!user) return 'User';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
  };

  return (
    <>
      {/* Header - visible on all screen sizes */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left: Burger menu (mobile/tablet) + Logo */}
          <div className="flex items-center gap-3">
            {/* Burger menu - mobile/tablet only */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <ShopItLogo size="sm" />
            </Link>
          </div>

          {/* Right: Publish button + Language switcher + Theme toggle + User menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Publish Button - Only for sellers, hidden on mobile (shown in sub-header) */}
            {hasRole(user?.role ?? 0, Role.SELLER) && store && (
              <div className="hidden sm:block">
                <PublishButton />
              </div>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-400"
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
                  className="w-5 h-5 text-gray-600 dark:text-gray-400"
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

            {/* User menu */}
            <UserMenuDropdown locale={locale} showViewStore />
          </div>
        </div>
      </header>

      {/* Mobile Sub-header - shows PublishButton on small screens */}
      {hasRole(user?.role ?? 0, Role.SELLER) && store && (
        <div className="sm:hidden sticky top-16 z-30 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-2">
          <PublishButton />
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          style={accentColors as React.CSSProperties}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-zinc-900 shadow-xl flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
              <Link href="/" onClick={() => setIsMenuOpen(false)}>
                <ShopItLogo size="md" />
              </Link>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <svg
                  className="w-6 h-6 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  {/* Section title */}
                  {section.titleKey && (
                    <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      {t(section.titleKey)}
                    </h3>
                  )}
                  {/* Section items */}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isItemActive = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors border-l-2 ${
                            isItemActive
                              ? ''
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border-transparent'
                          }`}
                          style={
                            isItemActive
                              ? {
                                  backgroundColor: accentColors['--accent-100'],
                                  color: accentColors['--accent-700'],
                                  borderLeftColor: accentColors['--accent-500'],
                                }
                              : undefined
                          }
                        >
                          {item.icon}
                          <span className="font-medium">
                            {t(item.labelKey)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* View Store Link - Only for sellers */}
            {store && hasRole(user?.role ?? 0, Role.SELLER) && (
              <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-zinc-800">
                <a
                  href={getStoreUrl(store.subdomain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
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
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <span className="font-medium">{t('viewStore')}</span>
                </a>
              </div>
            )}

            {/* User info and logout */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-zinc-800">
              {/* User Info */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-500)] flex items-center justify-center text-white font-semibold">
                  {getUserInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
                <span className="font-medium">{tNav('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LanguageSwitcher() {
  const t = useTranslations('common');
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 text-sm bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5 sm:p-1">
      <Link
        href={pathname}
        locale="ka"
        className={`px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md transition-all font-medium text-xs ${
          locale === 'ka'
            ? 'bg-[var(--accent-600)] dark:bg-[var(--accent-500)] text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <span className="sm:hidden">KA</span>
        <span className="hidden sm:inline">{t('georgian')}</span>
      </Link>
      <Link
        href={pathname}
        locale="en"
        className={`px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md transition-all font-medium text-xs ${
          locale === 'en'
            ? 'bg-[var(--accent-600)] dark:bg-[var(--accent-500)] text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        <span className="sm:hidden">EN</span>
        <span className="hidden sm:inline">{t('english')}</span>
      </Link>
    </div>
  );
}
