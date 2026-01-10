'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HomepageProduct } from '../../lib/api';
import { ProductCard } from './ProductCard';

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

  // Don't render if no products
  if (products.length === 0) {
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
          {hasMore && (
            <Link
              href={`/${locale}/products`}
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--store-accent-600)' }}
            >
              {t('seeAll')} →
            </Link>
          )}
        </div>

        {/* Products Grid - 2x4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              locale={locale}
              subdomain={subdomain}
              storeId={storeId}
              storeName={storeName}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

