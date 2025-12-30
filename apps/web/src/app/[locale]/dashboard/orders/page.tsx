import { getTranslations } from 'next-intl/server';

export default async function OrdersPage() {
  const t = await getTranslations('dashboard');

  // TODO: Fetch orders from API
  const orders: unknown[] = [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {t('orders')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View and manage your orders.
        </p>
      </div>

      {orders.length === 0 ? (
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Orders Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              When customers place orders, they&apos;ll appear here. Share your store 
              to start receiving orders!
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm overflow-hidden">
          {/* Orders table will go here */}
        </div>
      )}
    </div>
  );
}


