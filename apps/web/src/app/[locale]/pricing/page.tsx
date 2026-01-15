'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Link } from '../../../i18n/routing';

interface SiteSettings {
  siteCommissionRate: number;
  courierEarningsPercentage: number;
}

export default function PricingPage() {
  const t = useTranslations('pricing');
  const tCommon = useTranslations('common');
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${API_BASE}/api/v1/admin/settings/public`)
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => {
        // Fallback to defaults
        setSettings({
          siteCommissionRate: 0.1,
          courierEarningsPercentage: 0.8,
        });
      });
  }, []);

  const commissionPercent = settings
    ? Math.round(settings.siteCommissionRate * 100)
    : 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
      {/* Hero */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('title')}
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-300">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Free Plan Card */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
            {/* Free Banner */}
            <div className="bg-gradient-to-r from-[var(--accent-500)] to-purple-600 py-6 px-8 text-center">
              <span className="text-white text-2xl font-bold">
                {t('freePlan')}
              </span>
            </div>

            <div className="p-8 lg:p-12">
              {/* Price */}
              <div className="text-center mb-10">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-6xl font-bold text-gray-900 dark:text-white">
                    ₾0
                  </span>
                  <span className="text-xl text-gray-500 dark:text-gray-400">
                    /{t('month')}
                  </span>
                </div>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                  {t('noHiddenFees')}
                </p>
              </div>

              {/* Features */}
              <div className="grid md:grid-cols-2 gap-6 mb-10">
                {[
                  'unlimitedProducts',
                  'customDomain',
                  'securePayments',
                  'analyticsIncluded',
                  'mobileOptimized',
                  'customerSupport',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-green-600 dark:text-green-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      {t(`features.${feature}`)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Commission Info */}
              <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-[var(--accent-600)] dark:text-[var(--accent-400)]"
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
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {t('commissionTitle')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t('commissionDescription', {
                        percent: commissionPercent,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent-600)] text-white rounded-xl hover:bg-[var(--accent-700)] transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  {tCommon('startForFree')}
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('questionsTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t('questionsDescription')}
          </p>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 text-[var(--accent-600)] dark:text-[var(--accent-400)] font-semibold hover:underline"
          >
            {t('viewFaq')}
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
