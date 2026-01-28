'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HomepageProduct } from '../../lib/api';
import { ProductCard } from './ProductCard';
import { useStoreEditOptional } from '../../contexts/StoreEditContext';

interface HomepageProductsProps {
  products: HomepageProduct[];
  hasMore: boolean;
  locale: string;
  subdomain: string;
  storeId?: string;
  storeName?: string;
}

export function HomepageProducts({
  products,
  hasMore,
  locale,
  subdomain,
  storeId,
  storeName,
}: HomepageProductsProps) {
  const t = useTranslations('store');
  const storeEdit = useStoreEditOptional();
  const isStoreOwner = storeEdit?.isStoreOwner ?? false;

  // Don't render if no products and not store owner
  if (products.length === 0 && !isStoreOwner) {
    return null;
  }

  return (
    <section className="py-12 bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('products')}
          </h2>
          {/* Add Product button for store owner */}
          {isStoreOwner && (
            <Link
              href={`/${locale}/dashboard/products/new`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--store-accent-600)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('addProduct') || 'Add Product'}
            </Link>
          )}
        </div>

        {/* Products Grid - 2x4 on desktop */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={{
                  ...product,
                  variantsCount: product.variants?.length ?? 0,
                }}
                locale={locale}
                subdomain={subdomain}
                storeId={storeId}
                storeName={storeName}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {t('noProducts') || 'No products yet'}
          </div>
        )}

        {/* See All link at bottom */}
        {hasMore && (
          <div className="text-center mt-8">
            <Link
              href={`/${locale}/products`}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--store-accent-600)' }}
            >
              {t('seeAll')} →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

