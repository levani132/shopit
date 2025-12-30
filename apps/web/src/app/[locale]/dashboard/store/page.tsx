import { getTranslations } from 'next-intl/server';

export default async function StoreSettingsPage() {
  const t = await getTranslations('dashboard');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {t('storeSettings')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your store branding, description, and settings.
        </p>
      </div>

      {/* Store Settings Form - Coming Soon */}
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Store Settings Coming Soon
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            You&apos;ll be able to update your store name, logo, cover image, description, 
            and brand colors here.
          </p>
        </div>
      </div>
    </div>
  );
}


