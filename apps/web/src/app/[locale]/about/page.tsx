'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Link } from '../../../i18n/routing';

interface AboutContent {
  missionKa: string;
  missionEn: string;
  storyKa: string;
  storyEn: string;
  teamMembers: Array<{
    name: string;
    role: string;
    image?: string;
  }>;
}

export default function AboutPage() {
  const t = useTranslations('about');
  const tCommon = useTranslations('common');
  const [content, setContent] = useState<AboutContent | null>(null);
  const [locale, setLocale] = useState('ka');

  useEffect(() => {
    // Get locale from URL
    const path = window.location.pathname;
    const urlLocale = path.split('/')[1];
    if (urlLocale === 'en' || urlLocale === 'ka') {
      setLocale(urlLocale);
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${API_BASE}/api/v1/content/about`)
      .then((res) => res.json())
      .then((data) => setContent(data))
      .catch(() => setContent(null));
  }, []);

  const mission = content
    ? locale === 'ka'
      ? content.missionKa
      : content.missionEn
    : null;
  const story = content
    ? locale === 'ka'
      ? content.storyKa
      : content.storyEn
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      {/* Hero */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
            {t('title')}
          </h1>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-300">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[var(--accent-500)] to-purple-600 rounded-3xl p-8 lg:p-12 text-white">
            <h2 className="text-2xl font-bold mb-4">{t('missionTitle')}</h2>
            <p className="text-lg text-white/90 leading-relaxed">
              {mission || t('missionDefault')}
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {t('storyTitle')}
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {story || t('storyDefault')}
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-gray-50 dark:bg-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            {t('valuesTitle')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {['simplicity', 'transparency', 'support'].map((value) => (
              <div
                key={value}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 flex items-center justify-center mb-4">
                  <ValueIcon type={value} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t(`values.${value}.title`)}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t(`values.${value}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('ctaTitle')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            {t('ctaDescription')}
          </p>
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
      </section>
    </div>
  );
}

function ValueIcon({ type }: { type: string }) {
  const iconClass =
    'w-6 h-6 text-[var(--accent-600)] dark:text-[var(--accent-400)]';

  switch (type) {
    case 'simplicity':
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
    case 'transparency':
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      );
    case 'support':
      return (
        <svg
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      );
    default:
      return null;
  }
}
