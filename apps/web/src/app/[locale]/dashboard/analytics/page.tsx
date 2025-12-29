import { getTranslations } from 'next-intl/server';

export default async function AnalyticsPage() {
  const t = await getTranslations('dashboard');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {t('analytics')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track your store performance and sales.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[var(--accent-600)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Analytics Coming Soon
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Soon you&apos;ll be able to track your store&apos;s performance, view sales charts, 
            and understand your customers better.
          </p>
        </div>
      </div>
    </div>
  );
}

