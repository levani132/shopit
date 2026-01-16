'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShopItLogo } from './ShopItLogo';
import { useAuth } from '../../contexts/AuthContext';
import { Role, hasRole } from '@sellit/constants';
import { getUserInitials } from '../../lib/utils';
import { getMainSiteUrl } from '../../utils/subdomain';

interface ShopItBarProps {
  variant?: 'store' | 'standalone';
  showCreateShop?: boolean;
}

export function ShopItBar({
  variant = 'store',
  showCreateShop = true,
}: ShopItBarProps) {
  const t = useTranslations('store');
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const [mainSiteUrl, setMainSiteUrl] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  useEffect(() => {
    setMainSiteUrl(getMainSiteUrl());
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSeller = hasRole(user?.role ?? 0, Role.SELLER);
  const isCourier = hasRole(user?.role ?? 0, Role.COURIER);
  const initials = user
    ? getUserInitials(user.firstName, user.lastName, user.email)
    : '';
  const displayName = user?.firstName || user?.email?.split('@')[0] || '';

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  const dashboardUrl = mainSiteUrl
    ? `${mainSiteUrl}/${locale}/dashboard`
    : `/${locale}/dashboard`;

  return (
    <div
      className={`bg-gray-900 dark:bg-zinc-950 text-white h-10 ${
        variant === 'standalone' ? 'fixed top-0 left-0 right-0 z-50' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* ShopIt Logo - links to main site */}
          <a
            href={mainSiteUrl || '/'}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <ShopItLogo
              size="sm"
              variant="light"
              useStoreAccent={variant === 'store'}
            />
          </a>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="w-20 h-6 bg-gray-700 rounded animate-pulse" />
            ) : isAuthenticated && user ? (
              // User menu
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
                >
                  <span className="text-sm font-medium max-w-[100px] truncate">
                    {displayName}
                  </span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium"
                    style={{
                      backgroundColor: 'var(--store-accent-500, #6366f1)',
                    }}
                  >
                    {initials}
                  </div>
                  <svg
                    className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
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

                {/* Dropdown */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 py-1 z-[100]">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                        style={{
                          backgroundColor: 'var(--store-accent-500, #6366f1)',
                        }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                        {isSeller && (
                          <span
                            className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full text-white"
                            style={{
                              backgroundColor:
                                'var(--store-accent-500, #6366f1)',
                            }}
                          >
                            {t('seller')}
                          </span>
                        )}
                        {isCourier && (
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white">
                            {t('courier')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      {/* Profile - goes to dashboard */}
                      <a
                        href={`${dashboardUrl}/profile`}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                      >
                        <svg
                          className="w-4 h-4"
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

                      {/* My Orders - aggregated from all shops */}
                      <a
                        href={`${dashboardUrl}/my-orders`}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                      >
                        <svg
                          className="w-4 h-4"
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

                      {/* Wishlist - aggregated from all shops */}
                      <a
                        href={`${dashboardUrl}/wishlist`}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                      >
                        <svg
                          className="w-4 h-4"
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

                      {/* Divider for sellers/couriers */}
                      {(isSeller || isCourier) && (
                        <>
                          <div className="border-t border-gray-100 dark:border-zinc-700 my-1" />

                          {/* Dashboard */}
                          <a
                            href={dashboardUrl}
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                          >
                            <svg
                              className="w-4 h-4"
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
                            {isCourier
                              ? t('courierDashboard')
                              : t('sellerDashboard')}
                          </a>
                        </>
                      )}

                      {/* Divider */}
                      <div className="border-t border-gray-100 dark:border-zinc-700 my-1" />

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-zinc-700"
                      >
                        <svg
                          className="w-4 h-4"
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
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Not logged in
              <>
                <a
                  href={`/${locale}/login`}
                  className="text-xs text-gray-300 hover:text-white transition-colors"
                >
                  {t('login')}
                </a>
                <a
                  href={`/${locale}/register`}
                  className="text-xs text-gray-300 hover:text-white transition-colors"
                >
                  {t('register')}
                </a>
                {showCreateShop && (
                  <a
                    href={`${mainSiteUrl}/${locale}/register`}
                    className="text-xs px-3 py-1 rounded-full text-white transition-colors"
                    style={{
                      backgroundColor: 'var(--store-accent-500, #6366f1)',
                    }}
                  >
                    {t('createShop')}
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
