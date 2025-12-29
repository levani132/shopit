import { getTranslations } from 'next-intl/server';
import { Link } from '../../../../i18n/routing';

export default async function ProductsPage() {
  const t = await getTranslations('dashboard');

  // TODO: Fetch products from API
  const products: unknown[] = [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            {t('products')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your products and inventory.
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="px-4 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('addProduct')}
        </Link>
      </div>

      {products.length === 0 ? (
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Products Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              Start by adding your first product to your store. You can add images, 
              set prices, and manage inventory.
            </p>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Product
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm overflow-hidden">
          {/* Products table will go here */}
        </div>
      )}
    </div>
  );
}

