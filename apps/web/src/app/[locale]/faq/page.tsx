'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Link } from '../../../i18n/routing';

interface FaqItem {
  _id: string;
  questionKa: string;
  questionEn: string;
  answerKa: string;
  answerEn: string;
  category: 'general' | 'sellers' | 'buyers' | 'couriers' | 'payments';
  order: number;
  isActive: boolean;
}

export default function FaqPage() {
  const t = useTranslations('faq');
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [locale, setLocale] = useState('ka');

  useEffect(() => {
    const path = window.location.pathname;
    const urlLocale = path.split('/')[1];
    if (urlLocale === 'en' || urlLocale === 'ka') {
      setLocale(urlLocale);
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${API_BASE}/api/v1/content/faq`)
      .then((res) => res.json())
      .then((data) => setFaqs(data.filter((f: FaqItem) => f.isActive)))
      .catch(() => setFaqs([]));
  }, []);

  const categories = [
    'all',
    'general',
    'sellers',
    'buyers',
    'couriers',
    'payments',
  ];

  const filteredFaqs =
    activeCategory === 'all'
      ? faqs
      : faqs.filter((f) => f.category === activeCategory);

  const getQuestion = (faq: FaqItem) =>
    locale === 'ka' ? faq.questionKa : faq.questionEn;
  const getAnswer = (faq: FaqItem) =>
    locale === 'ka' ? faq.answerKa : faq.answerEn;

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

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-[var(--accent-600)] text-white'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
              >
                {t(`categories.${cat}`)}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">{t('noFaqs')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((faq) => (
                <div
                  key={faq._id}
                  className="bg-gray-50 dark:bg-zinc-800 rounded-2xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === faq._id ? null : faq._id)
                    }
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                  >
                    <span className="font-medium text-gray-900 dark:text-white pr-4">
                      {getQuestion(faq)}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                        expandedId === faq._id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedId === faq._id && (
                    <div className="px-6 pb-5">
                      <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        {getAnswer(faq)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Contact CTA */}
          <div className="mt-16 text-center bg-gradient-to-r from-[var(--accent-500)] to-purple-600 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              {t('stillHaveQuestions')}
            </h2>
            <p className="text-white/90 mb-6">{t('contactUs')}</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[var(--accent-600)] rounded-xl hover:bg-gray-100 transition-all font-semibold"
            >
              {t('contactButton')}
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
