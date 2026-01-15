'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Link } from '../../../i18n/routing';

interface TermsContent {
  contentKa: string;
  contentEn: string;
  lastUpdated: string;
}

interface SiteSettings {
  siteCommissionRate: number;
  courierEarningsPercentage: number;
  minimumWithdrawalAmount: number;
}

export default function TermsPage() {
  const t = useTranslations('terms');
  const [content, setContent] = useState<TermsContent | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [locale, setLocale] = useState('ka');

  useEffect(() => {
    const path = window.location.pathname;
    const urlLocale = path.split('/')[1];
    if (urlLocale === 'en' || urlLocale === 'ka') {
      setLocale(urlLocale);
    }

    // Fetch terms content
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/content/terms`)
      .then((res) => res.json())
      .then((data) => setContent(data))
      .catch(() => setContent(null));

    // Fetch settings for dynamic values
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/settings/public`)
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => setSettings({ siteCommissionRate: 0.1, courierEarningsPercentage: 0.8, minimumWithdrawalAmount: 20 }));
  }, []);

  const termsText = content ? (locale === 'ka' ? content.contentKa : content.contentEn) : null;
  const commissionPercent = settings ? Math.round(settings.siteCommissionRate * 100) : 10;
  const courierPercent = settings ? Math.round(settings.courierEarningsPercentage * 100) : 80;
  const minWithdrawal = settings?.minimumWithdrawalAmount || 20;

  // Replace placeholders with actual values
  const processedText = termsText
    ?.replace(/\{commissionPercent\}/g, String(commissionPercent))
    ?.replace(/\{courierPercent\}/g, String(courierPercent))
    ?.replace(/\{minWithdrawal\}/g, String(minWithdrawal));

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      {/* Hero */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('title')}
          </h1>
          {content?.lastUpdated && (
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {t('lastUpdated')}: {new Date(content.lastUpdated).toLocaleDateString(locale === 'ka' ? 'ka-GE' : 'en-US')}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {processedText ? (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <div className="whitespace-pre-line text-gray-600 dark:text-gray-300 leading-relaxed">
                {processedText}
              </div>
            </div>
          ) : (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {/* Default Terms Content */}
              <h2>{t('sections.general.title')}</h2>
              <p>{t('sections.general.content')}</p>

              <h2>{t('sections.sellers.title')}</h2>
              <p>{t('sections.sellers.content', { commissionPercent })}</p>

              <h2>{t('sections.buyers.title')}</h2>
              <p>{t('sections.buyers.content')}</p>

              <h2>{t('sections.couriers.title')}</h2>
              <p>{t('sections.couriers.content', { courierPercent })}</p>

              <h2>{t('sections.payments.title')}</h2>
              <p>{t('sections.payments.content', { minWithdrawal })}</p>

              <h2>{t('sections.liability.title')}</h2>
              <p>{t('sections.liability.content')}</p>

              <h2>{t('sections.changes.title')}</h2>
              <p>{t('sections.changes.content')}</p>
            </div>
          )}

          {/* Back to Home */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-zinc-700">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[var(--accent-600)] dark:text-[var(--accent-400)] font-medium hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

