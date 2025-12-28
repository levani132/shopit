'use client';

import { useState, useEffect } from 'react';
import { useRegistration } from '../RegistrationContext';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

const BRAND_COLORS: Record<string, string> = {
  indigo: '#6366f1',
  rose: '#f43f5e',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  black: '#18181b',
};

export function Step3Auth() {
  const t = useTranslations('register');
  const router = useRouter();
  const { data, updateData, prevStep, setUnblurredSections } = useRegistration();
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const accentColor = BRAND_COLORS[data.brandColor] || BRAND_COLORS.indigo;

  // Animate unblurring header + hero when entering this step
  useEffect(() => {
    const timer = setTimeout(() => {
      setUnblurredSections(['header', 'hero']);
    }, 300);
    return () => clearTimeout(timer);
  }, [setUnblurredSections]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailSubmit = async () => {
    const newErrors: typeof errors = {};

    if (!data.email.trim()) {
      newErrors.email = t('emailRequired');
    } else if (!validateEmail(data.email)) {
      newErrors.email = t('emailInvalid');
    }

    if (!data.password) {
      newErrors.password = t('passwordRequired');
    } else if (data.password.length < 6) {
      newErrors.password = t('passwordMinLength');
    }

    if (data.password !== confirmPassword) {
      newErrors.confirmPassword = t('passwordsDoNotMatch');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      // TODO: Call registration API
      updateData({ authMethod: 'email' });
      
      // Navigate to profile completion page
      router.push('/register/complete');
    } catch (error) {
      console.error('Registration failed:', error);
      setErrors({ email: t('registrationFailed') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement Google OAuth
      updateData({ authMethod: 'google' });
      router.push('/register/complete');
    } catch (error) {
      console.error('Google signup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-end pb-8 p-4">
      {/* Step indicator - Outside paper */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: accentColor }}
          >
            ✓
          </div>
          <div className="w-8 h-0.5" style={{ backgroundColor: accentColor }} />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: accentColor }}
          >
            ✓
          </div>
          <div className="w-8 h-0.5" style={{ backgroundColor: accentColor }} />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: accentColor }}
          >
            3
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-1">
          {t('almostThere')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-5">
          {t('step3Description')}
        </p>

        {/* Google Sign Up */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isLoading}
          className="w-full py-2.5 px-4 border border-gray-300 dark:border-zinc-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-800 transition mb-4 text-gray-700 dark:text-gray-300 text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          {t('continueWithGoogle')}
        </button>

        {/* Divider */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white dark:bg-zinc-900 text-gray-400 dark:text-gray-500">
              {t('orContinueWith')}
            </span>
          </div>
        </div>

        {/* Email Form */}
        <div className="space-y-3">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => updateData({ email: e.target.value })}
              placeholder="name@example.com"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={data.password}
                onChange={(e) => updateData({ password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={prevStep}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition disabled:opacity-50 text-sm"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={handleEmailSubmit}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm"
            style={{ backgroundColor: accentColor }}
          >
            {isLoading ? t('creating') : t('createAccount')}
          </button>
        </div>
      </div>
    </div>
  );
}
