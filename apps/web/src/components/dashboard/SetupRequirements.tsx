'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';

interface MissingFields {
  profile: string[];
  store: string[];
  canPublish: boolean;
}

interface PublishStatus {
  publishStatus: 'draft' | 'pending_review' | 'published' | 'rejected';
  publishRequestedAt?: string;
  publishedAt?: string;
  publishRejectionReason?: string;
  missingFields: MissingFields;
}

const FIELD_LABELS: Record<string, string> = {
  // Profile fields
  firstName: 'fieldFirstName',
  lastName: 'fieldLastName',
  phone: 'fieldPhone',
  idNumber: 'fieldIdNumber',
  bankAccount: 'fieldBankAccount',
  // Store fields
  logo: 'fieldLogo',
  cover: 'fieldCover',
  nameKa: 'fieldNameKa',
  nameEn: 'fieldNameEn',
  description: 'fieldDescription',
  address: 'fieldAddress',
  location: 'fieldLocation',
  courierType: 'fieldCourierType',
};

// Map store fields to their corresponding tabs
const FIELD_TO_TAB: Record<string, string> = {
  logo: 'appearance',
  cover: 'appearance',
  nameKa: 'general',
  nameEn: 'general',
  description: 'general',
  phone: 'contact',
  address: 'contact',
  location: 'contact',
  courierType: 'shipping',
};

// Get the primary tab to link to based on missing store fields
const getStoreTab = (missingFields: string[]): string => {
  if (missingFields.length === 0) return 'general';
  // Prioritize: general > appearance > contact > shipping
  const priorities = ['general', 'appearance', 'contact', 'shipping'];
  for (const tab of priorities) {
    if (missingFields.some((field) => FIELD_TO_TAB[field] === tab)) {
      return tab;
    }
  }
  return 'general';
};

export default function SetupRequirements() {
  const t = useTranslations('dashboard');
  const pathname = usePathname();
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/stores/publish/status');
      if (response.ok) {
        const data = await response.json();
        // Ensure publishStatus defaults to 'draft' if null/undefined
        setStatus({
          ...data,
          publishStatus: data.publishStatus || 'draft',
        });
      } else {
        setError(`API error: ${response.status}`);
      }
    } catch (err) {
      console.error('[SetupRequirements] Failed to fetch publish status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch status on mount and when pathname changes (navigation)
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, pathname]);

  // Also refetch when page becomes visible (user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-6 mb-8 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/4" />
            <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-8">
        <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm">
            Failed to load publish status. Please refresh the page.
          </span>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // If published, don't show setup requirements
  if (status.publishStatus === 'published') {
    return null;
  }

  // If in review, show review status
  if (status.publishStatus === 'pending_review') {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg flex-shrink-0">
            <svg
              className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
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
          </div>
          <div>
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
              {t('publishInReview')}
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
              {t('publishRequestSent')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If rejected, show rejection reason
  if (status.publishStatus === 'rejected' && status.publishRejectionReason) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg flex-shrink-0">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              {t('publishRejected')}
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">
              <span className="font-medium">{t('rejectionReason')}:</span>{' '}
              {status.publishRejectionReason}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { missingFields } = status;

  // If can publish, show ready message
  if (missingFields.canPublish) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg flex-shrink-0">
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              {t('readyToPublish')}
            </h3>
            <p className="text-green-700 dark:text-green-300 text-sm mt-1">
              {t('readyToPublishDescription')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show missing fields
  const hasProfileIssues = missingFields.profile.length > 0;
  const hasStoreIssues = missingFields.store.length > 0;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-8">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex-shrink-0">
          <svg
            className="w-6 h-6 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200">
            {t('setupRequired')}
          </h3>
          <p className="text-amber-700 dark:text-amber-300 text-sm mt-1 mb-4">
            {t('setupRequiredDescription')}
          </p>

          <div className="space-y-4">
            {hasProfileIssues && (
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {t('missingProfileFields')}
                  </h4>
                  <Link
                    href="/dashboard/profile"
                    className="text-sm font-medium text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:underline"
                  >
                    {t('goToProfile')} →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missingFields.profile.map((field) => (
                    <span
                      key={field}
                      className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-full"
                    >
                      {t(FIELD_LABELS[field] || field)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasStoreIssues && (
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {t('missingStoreFields')}
                  </h4>
                  <Link
                    href={`/dashboard/store?tab=${getStoreTab(missingFields.store)}`}
                    className="text-sm font-medium text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:underline"
                  >
                    {t('goToStoreSettings')} →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missingFields.store.map((field) => (
                    <span
                      key={field}
                      className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-full"
                    >
                      {t(FIELD_LABELS[field] || field)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
