'use client';

import { useState } from 'react';
import { useRegistration } from './RegistrationContext';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { GEORGIAN_BANKS, detectBankFromIban, isValidGeorgianIban } from '../../utils/georgian-banks';
import { useAuth } from '../../contexts/AuthContext';

// Build API base URL - use just the host, we'll add the prefix
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// Remove any trailing slash and any existing /api/v1 prefix to avoid duplication
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

const BRAND_COLORS: Record<string, string> = {
  indigo: '#6366f1',
  rose: '#f43f5e',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  black: '#18181b',
};

interface FormErrors {
  ownerFirstName?: string;
  ownerLastName?: string;
  phoneNumber?: string;
  identificationNumber?: string;
  accountNumber?: string;
  beneficiaryBankCode?: string;
  general?: string;
}

export function ProfileCompletion() {
  const t = useTranslations('register');
  const router = useRouter();
  const { data, updateData } = useRegistration();
  const { refreshAuth, isAuthenticated, isLoading: authLoading } = useAuth();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const accentColor = BRAND_COLORS[data.brandColor] || BRAND_COLORS.indigo;

  const handleIbanChange = (iban: string) => {
    updateData({ accountNumber: iban.toUpperCase() });

    // Auto-detect bank from IBAN
    const bankCode = detectBankFromIban(iban);
    if (bankCode) {
      updateData({ beneficiaryBankCode: bankCode });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!data.ownerFirstName.trim()) {
      newErrors.ownerFirstName = t('firstNameRequired');
    }

    if (!data.ownerLastName.trim()) {
      newErrors.ownerLastName = t('lastNameRequired');
    }

    if (!data.phoneNumber.trim()) {
      newErrors.phoneNumber = t('phoneRequired');
    } else if (!/^\+995\d{9}$/.test(data.phoneNumber)) {
      newErrors.phoneNumber = t('phoneInvalid');
    }

    if (!data.identificationNumber.trim()) {
      newErrors.identificationNumber = t('idNumberRequired');
    } else if (data.identificationNumber.length !== 11) {
      newErrors.identificationNumber = t('idNumberInvalid');
    }

    if (!data.accountNumber.trim()) {
      newErrors.accountNumber = t('ibanRequired');
    } else if (!isValidGeorgianIban(data.accountNumber)) {
      newErrors.accountNumber = t('ibanInvalid');
    }

    if (!data.beneficiaryBankCode) {
      newErrors.beneficiaryBankCode = t('bankRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for auth
        body: JSON.stringify({
          firstName: data.ownerFirstName,
          lastName: data.ownerLastName,
          phoneNumber: data.phoneNumber,
          identificationNumber: data.identificationNumber,
          accountNumber: data.accountNumber,
          beneficiaryBankCode: data.beneficiaryBankCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          // User not authenticated, redirect to login
          router.push('/login');
          return;
        }
        setErrors({ general: errorData.message || t('profileCompletionFailed') });
        return;
      }

      // Refresh auth context to update user data
      await refreshAuth();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Profile completion failed:', error);
      setErrors({ general: t('profileCompletionFailed') });
    } finally {
      setIsLoading(false);
    }
  };

  // If not authenticated after auth loading is done, redirect to register
  if (!authLoading && !isAuthenticated) {
    router.push('/register');
    return null;
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* General error message */}
        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{errors.general}</p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4"
            style={{ backgroundColor: accentColor }}
          >
            {data.storeName.charAt(0).toUpperCase() || 'S'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('almostDone')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {t('profileCompletionDescription')}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8">
          {/* Info Box */}
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex gap-3">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  {t('whyWeNeedThis')}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('whyWeNeedThisDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('personalInformation')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('firstName')} *
              </label>
              <input
                id="firstName"
                type="text"
                value={data.ownerFirstName}
                onChange={(e) => updateData({ ownerFirstName: e.target.value })}
                placeholder={t('enterFirstName')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {errors.ownerFirstName && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerFirstName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('lastName')} *
              </label>
              <input
                id="lastName"
                type="text"
                value={data.ownerLastName}
                onChange={(e) => updateData({ ownerLastName: e.target.value })}
                placeholder={t('enterLastName')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {errors.ownerLastName && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerLastName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('phoneNumber')} *
              </label>
              <input
                id="phone"
                type="tel"
                value={data.phoneNumber}
                onChange={(e) => updateData({ phoneNumber: e.target.value })}
                placeholder="+995555123456"
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="idNumber"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('idNumber')} *
              </label>
              <input
                id="idNumber"
                type="text"
                value={data.identificationNumber}
                onChange={(e) =>
                  updateData({ identificationNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })
                }
                placeholder="01234567890"
                maxLength={11}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {errors.identificationNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.identificationNumber}</p>
              )}
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                {t('idNumberHint')}
              </p>
            </div>
          </div>

          {/* Bank Information */}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('bankInformation')}
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="iban"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('iban')} *
              </label>
              <input
                id="iban"
                type="text"
                value={data.accountNumber}
                onChange={(e) => handleIbanChange(e.target.value)}
                placeholder="GE29TB7777777777777777"
                maxLength={22}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-mono"
              />
              {errors.accountNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.accountNumber}</p>
              )}
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                {t('ibanHint')}
              </p>
            </div>

            <div>
              <label
                htmlFor="bank"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('bank')} *
              </label>
              <select
                id="bank"
                value={data.beneficiaryBankCode}
                onChange={(e) => updateData({ beneficiaryBankCode: e.target.value })}
                disabled={!!detectBankFromIban(data.accountNumber)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-60"
              >
                <option value="">{t('selectBank')}</option>
                {GEORGIAN_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name} ({bank.nameEn})
                  </option>
                ))}
              </select>
              {errors.beneficiaryBankCode && (
                <p className="text-red-500 text-sm mt-1">{errors.beneficiaryBankCode}</p>
              )}
              {detectBankFromIban(data.accountNumber) && (
                <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                  ✓ {t('bankDetectedAutomatically')}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full mt-8 py-4 px-6 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {isLoading ? t('completing') : t('completeRegistration')}
          </button>
        </div>

        {/* Security Note */}
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
          🔒 {t('securityNote')}
        </p>
      </div>
    </div>
  );
}


