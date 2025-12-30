'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import { ShopItLogo } from '../../../../components/ui/ShopItLogo';

function AuthCallbackContent() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { checkAuth } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get('success');
      const hasStore = searchParams.get('hasStore');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setTimeout(() => {
          router.push(`/${locale}/login?error=${error}`);
        }, 2000);
        return;
      }

      if (success === 'true') {
        // Refresh auth state (cookies are already set by the server)
        const isAuthenticated = await checkAuth();

        if (isAuthenticated) {
          setStatus('success');
          // Redirect based on store status
          setTimeout(() => {
            if (hasStore === 'true') {
              router.push(`/${locale}/dashboard`);
            } else {
              router.push(`/${locale}/register`);
            }
          }, 1000);
        } else {
          setStatus('error');
          setTimeout(() => {
            router.push(`/${locale}/login?error=auth_failed`);
          }, 2000);
        }
      } else {
        setStatus('error');
        setTimeout(() => {
          router.push(`/${locale}/login`);
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, router, locale, checkAuth]);

  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <ShopItLogo size="xl" />
      </div>

      {status === 'loading' && (
        <>
          <div className="w-12 h-12 border-4 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Completing authentication...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Login successful! Redirecting...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Authentication failed. Redirecting...
          </p>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <ShopItLogo size="xl" />
      </div>
      <div className="w-12 h-12 border-4 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
      <Suspense fallback={<LoadingFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
