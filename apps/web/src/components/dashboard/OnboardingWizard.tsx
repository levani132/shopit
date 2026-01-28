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

interface StoreStats {
  totalProducts: number;
}

interface Step {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  isComplete: boolean;
  isCurrent: boolean;
}

// Icons
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const ProfileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const StoreIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const ProductIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

const PublishIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default function OnboardingWizard() {
  const t = useTranslations('dashboard');
  const pathname = usePathname();
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [publishStatus, stats] = await Promise.all([
        api.get('/stores/publish/status'),
        api.get('/stores/stats').catch(() => ({ totalProducts: 0 })),
      ]);
      setStatus({
        ...publishStatus,
        publishStatus: publishStatus.publishStatus || 'draft',
      });
      setStoreStats(stats);
    } catch (err) {
      console.error('[OnboardingWizard] Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, pathname]);

  // Poll for updates every 5 seconds to catch changes from other pages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-[var(--accent-50)] to-[var(--accent-100)] dark:from-[var(--accent-900)]/20 dark:to-[var(--accent-800)]/20 rounded-2xl p-6 mb-8 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/50 dark:bg-zinc-700 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-white/50 dark:bg-zinc-700 rounded w-1/3" />
            <div className="h-4 bg-white/50 dark:bg-zinc-700 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return null;
  }

  // If published, don't show onboarding
  if (status.publishStatus === 'published') {
    return null;
  }

  // If in review, show different message
  if (status.publishStatus === 'pending_review') {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-full flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
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

  const { missingFields } = status;
  const hasProducts = (storeStats?.totalProducts ?? 0) > 0;

  // Define steps
  const steps: Step[] = [
    {
      id: 'profile',
      title: t('onboardingStep1Title'),
      description: t('onboardingStep1Desc'),
      href: '/dashboard/profile',
      icon: <ProfileIcon />,
      isComplete: missingFields.profile.length === 0,
      isCurrent: missingFields.profile.length > 0,
    },
    {
      id: 'store',
      title: t('onboardingStep2Title'),
      description: t('onboardingStep2Desc'),
      href: '/dashboard/store',
      icon: <StoreIcon />,
      isComplete: missingFields.store.length === 0,
      isCurrent: missingFields.profile.length === 0 && missingFields.store.length > 0,
    },
    {
      id: 'products',
      title: t('onboardingStep3Title'),
      description: t('onboardingStep3Desc'),
      href: '/dashboard/products/new',
      icon: <ProductIcon />,
      isComplete: hasProducts,
      isCurrent: missingFields.profile.length === 0 && missingFields.store.length === 0 && !hasProducts,
    },
    {
      id: 'publish',
      title: t('onboardingStep4Title'),
      description: t('onboardingStep4Desc'),
      href: '/dashboard/store?tab=publish',
      icon: <PublishIcon />,
      isComplete: false,
      isCurrent: missingFields.canPublish && hasProducts,
    },
  ];

  const completedSteps = steps.filter((s) => s.isComplete).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="bg-gradient-to-r from-[var(--accent-50)] to-purple-50 dark:from-[var(--accent-900)]/20 dark:to-purple-900/20 border border-[var(--accent-200)] dark:border-[var(--accent-800)] rounded-2xl p-6 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/40 rounded-full">
            <svg className="w-6 h-6 text-[var(--accent-600)] dark:text-[var(--accent-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('onboardingTitle')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
              {t('onboardingSubtitle')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[var(--accent-600)] dark:text-[var(--accent-400)]">
            {completedSteps}/{steps.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{t('stepsCompleted')}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-500)] to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <Link
            key={step.id}
            href={step.href}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
              step.isComplete
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : step.isCurrent
                  ? 'bg-white dark:bg-zinc-800 border-2 border-[var(--accent-400)] dark:border-[var(--accent-500)] shadow-md'
                  : 'bg-white/50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 opacity-60'
            } hover:shadow-md`}
          >
            {/* Step Number / Check */}
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                step.isComplete
                  ? 'bg-green-500 text-white'
                  : step.isCurrent
                    ? 'bg-[var(--accent-500)] text-white'
                    : 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {step.isComplete ? <CheckIcon /> : <span className="font-semibold">{index + 1}</span>}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${step.isComplete ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                  {step.title}
                </span>
                {step.isCurrent && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/40 text-[var(--accent-700)] dark:text-[var(--accent-300)] rounded-full">
                    {t('currentStep')}
                  </span>
                )}
              </div>
              <p className={`text-sm mt-0.5 ${step.isComplete ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {step.description}
              </p>
            </div>

            {/* Icon */}
            <div className={`flex-shrink-0 ${step.isComplete ? 'text-green-500' : step.isCurrent ? 'text-[var(--accent-500)]' : 'text-gray-400'}`}>
              {step.icon}
            </div>

            {/* Arrow */}
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
