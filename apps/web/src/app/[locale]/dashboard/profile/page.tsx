import { getTranslations } from 'next-intl/server';

export default async function ProfilePage() {
  const t = await getTranslations('dashboard');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {t('profile')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal and banking information.
        </p>
      </div>

      <div className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Personal Information
          </h2>
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Profile editing coming soon...
            </p>
          </div>
        </div>

        {/* Banking Information */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Banking Information
          </h2>
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Banking details editing coming soon...
            </p>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Security
          </h2>
          <div className="space-y-4">
            <button className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
              Change Password
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Danger Zone
          </h2>
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">
            These actions are irreversible. Please be careful.
          </p>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

