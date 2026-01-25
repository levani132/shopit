'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShopItLogo } from './ShopItLogo';
import { UserMenuDropdown } from './UserMenuDropdown';
import { useAuth } from '../../contexts/AuthContext';
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [mainSiteUrl, setMainSiteUrl] = useState('');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  useEffect(() => {
    setMainSiteUrl(getMainSiteUrl());
  }, []);

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
              <UserMenuDropdown
                dashboardBaseUrl={mainSiteUrl}
                locale={locale}
                showWishlist
                variant="store"
              />
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
