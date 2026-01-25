'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../contexts/AuthContext';
import { hasRole, Role, getPrimaryRoleName } from '@shopit/constants';
import { getUserInitials } from '../../lib/utils';
import { getStoreUrl } from '../../utils/subdomain';
import Link from 'next/link';

export interface UserMenuDropdownProps {
  /** Base URL for dashboard links (e.g., main site URL or empty for relative) */
  dashboardBaseUrl?: string;
  /** Current locale */
  locale?: string;
  /** Whether to show wishlist link */
  showWishlist?: boolean;
  /** Whether to show "View My Store" link (for sellers in dashboard) */
  showViewStore?: boolean;
  /** Variant styling - affects avatar color */
  variant?: 'default' | 'store';
  /** Compact mode - smaller button without name text */
  compact?: boolean;
  /** Callback when menu closes (for parent component state sync) */
  onMenuClose?: () => void;
}

// Helper to render menu item with Link or anchor based on dashboardBaseUrl
function MenuItem({
  href,
  dashboardBaseUrl,
  onClick,
  icon,
  label,
  className = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700',
}: {
  href: string;
  dashboardBaseUrl?: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  const baseClass = `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${className}`;

  if (dashboardBaseUrl) {
    return (
      <a href={href} onClick={onClick} className={baseClass}>
        {icon}
        {label}
      </a>
    );
  }

  // Extract the path after /dashboard for Link
  const linkHref = href.replace(/^.*\/dashboard/, '/dashboard');
  return (
    <Link href={linkHref} onClick={onClick} className={baseClass}>
      {icon}
      {label}
    </Link>
  );
}

export function UserMenuDropdown({
  dashboardBaseUrl = '',
  locale = 'en',
  showWishlist = false,
  showViewStore = false,
  variant = 'default',
  compact = false,
  onMenuClose,
}: UserMenuDropdownProps) {
  const t = useTranslations('nav');
  const tDashboard = useTranslations('dashboard');
  const { user, store, logout, isImpersonating, stopImpersonation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onMenuClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onMenuClose]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        onMenuClose?.();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onMenuClose]);

  if (!user) return null;

  const userRole = user.role ?? 0;
  const isSeller = hasRole(userRole, Role.SELLER);
  const isCourier = hasRole(userRole, Role.COURIER);
  const isAdmin = hasRole(userRole, Role.ADMIN);
  const isCourierAdmin = hasRole(userRole, Role.COURIER_ADMIN);
  const hasPendingCourierApplication =
    user.courierAppliedAt && !isCourier && !user.isCourierApproved;

  const initials = getUserInitials(user.firstName, user.lastName, user.email);
  const displayName = user.firstName || user.email?.split('@')[0] || '';

  const handleClose = () => {
    setIsOpen(false);
    onMenuClose?.();
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  const handleStopImpersonation = async () => {
    handleClose();
    await stopImpersonation();
  };

  // Build URLs
  const basePath = dashboardBaseUrl
    ? `${dashboardBaseUrl}/${locale}/dashboard`
    : `/${locale}/dashboard`;

  // Determine avatar background color
  const avatarBgStyle =
    variant === 'store'
      ? { backgroundColor: 'var(--store-accent-500, #6366f1)' }
      : undefined;
  const avatarBgClass = variant === 'store' ? '' : 'bg-[var(--accent-500)]';

  // Get role label for display
  const getRoleLabel = () => {
    const primaryRole = getPrimaryRoleName(userRole);
    if (primaryRole && primaryRole !== 'user') return t(primaryRole);
    return null;
  };

  // Icons
  const icons = {
    profile: (
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
    ),
    orders: (
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
    ),
    wishlist: (
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
    ),
    dashboard: (
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
    ),
    products: (
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
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
    storeSettings: (
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
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
    delivery: (
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
          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
        />
      </svg>
    ),
    users: (
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
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    pendingStores: (
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
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    viewStore: (
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
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    ),
    returnAsAdmin: (
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
          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
        />
      </svg>
    ),
    logout: (
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
    ),
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {!compact && (
          <span className="text-sm font-medium max-w-[100px] truncate hidden sm:block">
            {displayName}
          </span>
        )}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${avatarBgClass}`}
          style={avatarBgStyle}
        >
          {initials}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 py-1 z-[100] max-h-[70vh] overflow-y-auto">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${avatarBgClass}`}
                style={avatarBgStyle}
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
                <div className="flex flex-wrap gap-1 mt-1">
                  {isAdmin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500 text-white">
                      {t('admin')}
                    </span>
                  )}
                  {isCourierAdmin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500 text-white">
                      {t('courierAdmin')}
                    </span>
                  )}
                  {isSeller && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-500)] text-white">
                      {t('seller')}
                    </span>
                  )}
                  {isCourier && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white">
                      {t('courier')}
                    </span>
                  )}
                  {hasPendingCourierApplication && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white">
                      {tDashboard('courierApplicationPending')}
                    </span>
                  )}
                  {!isAdmin &&
                    !isSeller &&
                    !isCourier &&
                    !hasPendingCourierApplication &&
                    getRoleLabel() && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]">
                        {getRoleLabel()}
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* Common Menu Items (all users) */}
          <div className="py-1">
            {/* View My Store - Only for sellers when enabled */}
            {showViewStore && store?.subdomain && isSeller && (
              <a
                href={getStoreUrl(store.subdomain)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                onClick={handleClose}
              >
                {icons.viewStore}
                {tDashboard('viewStore')}
              </a>
            )}

            <MenuItem
              href={basePath}
              dashboardBaseUrl={dashboardBaseUrl}
              onClick={handleClose}
              icon={icons.dashboard}
              label={t('overview')}
            />
            <MenuItem
              href={`${basePath}/profile`}
              dashboardBaseUrl={dashboardBaseUrl}
              onClick={handleClose}
              icon={icons.profile}
              label={t('profile')}
            />
            <MenuItem
              href={`${basePath}/my-orders`}
              dashboardBaseUrl={dashboardBaseUrl}
              onClick={handleClose}
              icon={icons.orders}
              label={t('myOrders')}
            />

            {showWishlist && (
              <MenuItem
                href={`${basePath}/wishlist`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.wishlist}
                label={t('wishlist')}
              />
            )}
          </div>

          {/* Seller Section */}
          {isSeller && (
            <>
              <div className="border-t border-gray-100 dark:border-zinc-700 my-1" />
              <div className="px-3 py-1">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t('seller')}
                </span>
              </div>
              <MenuItem
                href={`${basePath}/products`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.products}
                label={t('products')}
              />
              <MenuItem
                href={`${basePath}/orders`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.orders}
                label={t('sellerOrders')}
              />
              <MenuItem
                href={`${basePath}/store`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.storeSettings}
                label={t('storeSettings')}
              />
            </>
          )}

          {/* Courier Section */}
          {isCourier && (
            <>
              <div className="border-t border-gray-100 dark:border-zinc-700 my-1" />
              <div className="px-3 py-1">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t('courier')}
                </span>
              </div>
              <MenuItem
                href={`${basePath}/courier`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.delivery}
                label={t('myDeliveries')}
              />
            </>
          )}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="border-t border-gray-100 dark:border-zinc-700 my-1" />
              <div className="px-3 py-1">
                <span className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
                  {t('admin')}
                </span>
              </div>
              <MenuItem
                href={`${basePath}/admin/users`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.users}
                label={t('manageUsers')}
              />
              <MenuItem
                href={`${basePath}/admin/pending-stores`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.pendingStores}
                label={t('pendingStores')}
              />
            </>
          )}

          {/* Courier Admin Section */}
          {isCourierAdmin && (
            <>
              <div className="border-t border-gray-100 dark:border-zinc-700 my-1" />
              <div className="px-3 py-1">
                <span className="text-xs font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider">
                  {t('courierAdmin')}
                </span>
              </div>
              <MenuItem
                href={`${basePath}/courier-admin`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.dashboard}
                label={t('courierAnalytics')}
              />
              <MenuItem
                href={`${basePath}/courier-admin/couriers`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.users}
                label={t('manageCouriers')}
              />
              <MenuItem
                href={`${basePath}/courier-admin/orders`}
                dashboardBaseUrl={dashboardBaseUrl}
                onClick={handleClose}
                icon={icons.orders}
                label={t('allDeliveryOrders')}
              />
            </>
          )}

          <div className="border-t border-gray-100 dark:border-zinc-700 my-1" />

          {/* Return as Admin (shown only when impersonating) */}
          {isImpersonating && (
            <button
              onClick={handleStopImpersonation}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              {icons.returnAsAdmin}
              {t('returnAsAdmin')}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            {icons.logout}
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}
