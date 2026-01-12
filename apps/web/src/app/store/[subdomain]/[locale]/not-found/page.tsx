import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

interface StoreNotFoundPageProps {
  params: Promise<{
    subdomain: string;
    locale: string;
  }>;
}

export default async function StoreNotFoundPage({
  params,
}: StoreNotFoundPageProps) {
  const { subdomain } = await params;
  const t = await getTranslations('store');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-gray-500/20">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* 404 */}
        <div className="text-6xl font-bold text-gray-200 dark:text-zinc-800 mb-4">
          404
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('storeNotFound')}
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('storeNotFoundDescription', { storeName: subdomain })}
        </p>

        {/* Store name badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-gray-100 dark:border-zinc-700 mb-8">
          <span className="w-2 h-2 bg-red-400 rounded-full" />
          <span className="font-medium text-gray-900 dark:text-white line-through opacity-50">
            {subdomain}.shopit.ge
          </span>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('createYourStore')}
          </p>
          <Link
            href="https://shopit.ge"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/30"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('startForFree')}
          </Link>
        </div>
      </div>
    </div>
  );
}

