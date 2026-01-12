import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

interface ComingSoonPageProps {
  params: Promise<{
    subdomain: string;
    locale: string;
  }>;
}

export default async function ComingSoonPage({ params }: ComingSoonPageProps) {
  const { subdomain } = await params;
  const t = await getTranslations('store');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {t('comingSoon')}
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('comingSoonDescription', { storeName: subdomain })}
        </p>

        {/* Store name badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-gray-100 dark:border-zinc-700 mb-8">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <span className="font-medium text-gray-900 dark:text-white">
            {subdomain}.shopit.ge
          </span>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('comingSoonCTA')}
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {t('goToShopIt')}
          </Link>
        </div>
      </div>
    </div>
  );
}

