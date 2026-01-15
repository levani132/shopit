'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Link } from '../../../i18n/routing';

interface PrivacyContent {
  contentKa: string;
  contentEn: string;
  lastUpdated: string;
}

export default function PrivacyPage() {
  const t = useTranslations('privacy');
  const [content, setContent] = useState<PrivacyContent | null>(null);
  const [locale, setLocale] = useState('ka');

  useEffect(() => {
    const path = window.location.pathname;
    const urlLocale = path.split('/')[1];
    if (urlLocale === 'en' || urlLocale === 'ka') {
      setLocale(urlLocale);
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${API_BASE}/api/v1/content/privacy`)
      .then((res) => res.json())
      .then((data) => setContent(data))
      .catch(() => setContent(null));
  }, []);

  const privacyText = content
    ? locale === 'ka'
      ? content.contentKa
      : content.contentEn
    : null;

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
              {t('lastUpdated')}:{' '}
              {new Date(content.lastUpdated).toLocaleDateString(
                locale === 'ka' ? 'ka-GE' : 'en-US',
              )}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {privacyText ? (
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <div className="whitespace-pre-line text-gray-600 dark:text-gray-300 leading-relaxed">
                {privacyText}
              </div>
            </div>
          ) : (
            <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
              {/* Default Privacy Content */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('sections.collection.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('sections.collection.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('sections.usage.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('sections.usage.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('sections.sharing.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('sections.sharing.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('sections.security.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('sections.security.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('sections.cookies.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('sections.cookies.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('sections.rights.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('sections.rights.content')}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('sections.contact.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('sections.contact.content')}
                </p>
              </section>
            </div>
          )}

          {/* Back to Home */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-zinc-700">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[var(--accent-600)] dark:text-[var(--accent-400)] font-medium hover:underline"
            >
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
