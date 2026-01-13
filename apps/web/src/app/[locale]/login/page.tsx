'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '../../../contexts/AuthContext';
import { ShopItLogo } from '../../../components/ui/ShopItLogo';
import { getStoreBySubdomain } from '../../../lib/api';
import Link from 'next/link';

import { ACCENT_COLORS, AccentColorName } from '@sellit/constants';

interface StoreInfo {
  name: string;
  subdomain: string;
  brandColor: string;
}

/**
 * Extract subdomain from hostname
 */
function getSubdomainFromHostname(): string | null {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  if (parts.length > 2 && parts[0] !== 'www') {
    return parts[0];
  }

  return null;
}

function LoginPageContent() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store subdomain detection
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [isOnStore, setIsOnStore] = useState(false);

  // Detect if on store subdomain and fetch store info
  useEffect(() => {
    const subdomain = getSubdomainFromHostname();
    if (subdomain) {
      setIsOnStore(true);
      getStoreBySubdomain(subdomain).then((store) => {
        if (store) {
          setStoreInfo({
            name: store.name,
            subdomain: store.subdomain,
            brandColor: store.brandColor,
          });
        }
      });
    }
  }, []);

  // Get accent colors - only needed for store subdomains
  // On main site, we use CSS variables (--accent-*) set by AccentColorProvider
  const storeColors = storeInfo
    ? ACCENT_COLORS[storeInfo.brandColor as AccentColorName] ||
      ACCENT_COLORS.indigo
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      
      // Handle redirect after login
      if (redirectUrl) {
        // Handle cross-subdomain redirects (e.g., /couriers/ka/apply)
        if (redirectUrl.startsWith('/couriers/')) {
          const hostname = window.location.hostname;
          const protocol = window.location.protocol;
          const port = window.location.port;
          
          let couriersUrl = '';
          if (hostname === 'localhost') {
            const portSuffix = port ? `:${port}` : '';
            couriersUrl = `${protocol}//couriers.localhost${portSuffix}`;
          } else if (hostname.includes('.')) {
            // Production: shopit.ge -> couriers.shopit.ge
            couriersUrl = `${protocol}//couriers.${hostname}`;
          }
          
          // Extract the path after /couriers (e.g., /ka/apply)
          const pathAfterCouriers = redirectUrl.replace('/couriers', '');
          window.location.href = `${couriersUrl}${pathAfterCouriers}`;
          return;
        }
        
        // Normal redirect within the same domain
        router.push(redirectUrl);
      } else if (isOnStore) {
        router.push('/');
      } else {
        router.push(`/${locale}/dashboard`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const apiUrl = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    window.location.href = `${apiUrl}/api/v1/auth/google`;
  };

  // CSS variables for store colors (only on store subdomains)
  const storeColorStyle = storeColors
    ? ({
        '--store-accent-500': storeColors[500],
        '--store-accent-600': storeColors[600],
        '--store-accent-700': storeColors[700],
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 px-4"
      style={storeColorStyle}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link
            href={isOnStore ? '/' : `/${locale}`}
            className="flex items-center gap-2"
          >
            <ShopItLogo size="xl" useStoreAccent={isOnStore} />
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            {isOnStore ? 'Welcome Back' : t('auth.login')}
          </h1>
          {isOnStore && storeInfo && (
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Sign in to continue shopping at {storeInfo.name}
            </p>
          )}
          {!isOnStore && <div className="mb-6" />}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                style={
                  {
                    '--tw-ring-color': storeColors
                      ? storeColors[500]
                      : 'var(--accent-500)',
                  } as React.CSSProperties
                }
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent"
                style={
                  {
                    '--tw-ring-color': storeColors
                      ? storeColors[500]
                      : 'var(--accent-500)',
                  } as React.CSSProperties
                }
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-3 px-4 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: storeColors
                  ? storeColors[600]
                  : 'var(--accent-600)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = storeColors
                  ? storeColors[700]
                  : 'var(--accent-700)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = storeColors
                  ? storeColors[600]
                  : 'var(--accent-600)';
              }}
            >
              {isSubmitting ? t('common.loading') : t('auth.login')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-zinc-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 border border-gray-300 dark:border-zinc-600 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Google
            </span>
          </button>

          {/* Register Link */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('auth.noAccount')}{' '}
            <Link
              href={isOnStore ? '/register' : `/${locale}/register`}
              className="font-medium hover:underline"
              style={{
                color: storeColors ? storeColors[600] : 'var(--accent-600)',
              }}
            >
              {t('auth.signUp')}
            </Link>
          </p>

          {/* Back to store link */}
          {isOnStore && (
            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-500">
              <Link href="/" className="hover:underline">
                ← Back to store
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginPageContent />
    </Suspense>
  );
}
