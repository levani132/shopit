'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ShopItLogo } from '../../../../components/ui/ShopItLogo';
import { getStoreBySubdomain } from '../../../../lib/api';
import Link from 'next/link';

// Accent color CSS variables mapping
const ACCENT_COLORS: Record<string, Record<string, string>> = {
  rose: {
    '--store-accent-500': '#f43f5e',
    '--store-accent-600': '#e11d48',
    '--store-accent-700': '#be123c',
  },
  blue: {
    '--store-accent-500': '#3b82f6',
    '--store-accent-600': '#2563eb',
    '--store-accent-700': '#1d4ed8',
  },
  green: {
    '--store-accent-500': '#22c55e',
    '--store-accent-600': '#16a34a',
    '--store-accent-700': '#15803d',
  },
  purple: {
    '--store-accent-500': '#a855f7',
    '--store-accent-600': '#9333ea',
    '--store-accent-700': '#7e22ce',
  },
  orange: {
    '--store-accent-500': '#f97316',
    '--store-accent-600': '#ea580c',
    '--store-accent-700': '#c2410c',
  },
  indigo: {
    '--store-accent-500': '#6366f1',
    '--store-accent-600': '#4f46e5',
    '--store-accent-700': '#4338ca',
  },
  black: {
    '--store-accent-500': '#71717a',
    '--store-accent-600': '#52525b',
    '--store-accent-700': '#3f3f46',
  },
};

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

export default function BuyerRegisterPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  // Get accent colors for store or default
  const accentColors = storeInfo
    ? ACCENT_COLORS[storeInfo.brandColor] || ACCENT_COLORS.indigo
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const apiUrl = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

      const response = await fetch(`${apiUrl}/api/v1/auth/register/buyer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Registration failed');
      }

      // Redirect back to store or home
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const apiUrl = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    window.location.href = `${apiUrl}/api/v1/auth/google?role=user`;
  };

  // CSS variable style for store colors
  const storeColorStyle = accentColors
    ? (accentColors as React.CSSProperties)
    : undefined;

  const accentVar = isOnStore ? '--store-accent' : '--accent';

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 px-4 py-12"
      style={storeColorStyle}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <ShopItLogo size="xl" useStoreAccent={isOnStore} />
          </Link>
        </div>

        {/* Register Card */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Create Account
          </h1>
          {storeInfo && (
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Join {storeInfo.name} to start shopping
            </p>
          )}
          {!storeInfo && (
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Sign up to start shopping
            </p>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(${accentVar}-500)] focus:border-transparent`}
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(${accentVar}-500)] focus:border-transparent`}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(${accentVar}-500)] focus:border-transparent`}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(${accentVar}-500)] focus:border-transparent`}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(${accentVar}-500)] focus:border-transparent`}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 bg-[var(${accentVar}-600)] hover:bg-[var(${accentVar}-700)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-zinc-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400">
                or continue with
              </span>
            </div>
          </div>

          {/* Google Signup */}
          <button
            onClick={handleGoogleSignup}
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

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className={`text-[var(${accentVar}-600)] hover:text-[var(${accentVar}-700)] font-medium`}
            >
              Sign in
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

