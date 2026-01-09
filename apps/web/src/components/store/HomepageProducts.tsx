'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { HomepageProduct } from '../../lib/api';

interface HomepageProductsProps {
  products: HomepageProduct[];
  hasMore: boolean;
  locale: string;
  subdomain: string;
}

// Helper to get localized text
function getLocalizedText(
  localized: { ka?: string; en?: string } | undefined,
  fallback: string | undefined,
  locale: string
): string {
  if (localized) {
    return (locale === 'ka' ? localized.ka : localized.en) || fallback || '';
  }
  return fallback || '';
}

export function HomepageProducts({ products, hasMore, locale, subdomain }: HomepageProductsProps) {
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
              href={`/store/${subdomain}/${locale}/products`}
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--store-accent-600)' }}
            >
              {t('seeAll')} →
            </Link>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {products.map((product) => {
            const name = getLocalizedText(product.nameLocalized, product.name, locale);
            const hasDiscount = product.isOnSale && product.salePrice && product.salePrice < product.price;
            const displayPrice = hasDiscount ? product.salePrice : product.price;
            const isOutOfStock = product.stock <= 0;

            return (
              <Link
                key={product._id}
                href={`/store/${subdomain}/${locale}/products/${product._id}`}
                className="group"
              >
                <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl overflow-hidden transition-transform group-hover:scale-[1.02]">
                  {/* Product Image */}
                  <div className="aspect-square relative">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Sale Badge */}
                    {hasDiscount && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded">
                        {t('sale')}
                      </span>
                    )}

                    {/* Out of Stock Overlay */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-white text-gray-900 text-sm font-medium px-3 py-1 rounded">
                          {t('outOfStock')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1 min-h-[2.5rem]">
                      {name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-bold"
                        style={{ color: 'var(--store-accent-600)' }}
                      >
                        ₾{displayPrice?.toFixed(2)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-gray-400 line-through">
                          ₾{product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

