'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function CheckoutFailPage() {
  const t = useTranslations('checkout');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ka';
  const errorMessage = searchParams.get('error');

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        {t('failTitle')}
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        {t('failDescription')}
      </p>

      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href={`/${locale}/checkout`}
          className="inline-block px-6 py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
        >
          {t('tryAgain')}
        </Link>

        <Link
          href={`/${locale}/cart`}
          className="inline-block px-6 py-3 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {t('returnToCart')}
        </Link>
      </div>
    </div>
  );
}

