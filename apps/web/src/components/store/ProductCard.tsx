'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';

export interface ProductCardData {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  images: string[];
  stock: number;
  totalStock?: number;
  hasVariants?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  locale: string;
  subdomain: string;
  storeId?: string;
  storeName?: string;
  showBuyNow?: boolean;
}

function getLocalizedText(
  localized: { ka?: string; en?: string } | undefined,
  fallback: string,
  locale: string,
): string {
  if (localized) {
    return (locale === 'ka' ? localized.ka : localized.en) || fallback;
  }
  return fallback;
}

export function ProductCard({
  product,
  locale,
  subdomain,
  storeId,
  storeName,
  showBuyNow = true,
}: ProductCardProps) {
  const t = useTranslations('store');
  const router = useRouter();
  const { addItem } = useCart();

  const name = getLocalizedText(product.nameLocalized, product.name, locale);
  const hasDiscount =
    product.isOnSale && product.salePrice && product.salePrice < product.price;
  const displayPrice = hasDiscount ? product.salePrice : product.price;

  // Use totalStock for products with variants, otherwise use stock
  const effectiveStock = product.hasVariants
    ? product.totalStock ?? 0
    : product.stock;
  const isOutOfStock = effectiveStock <= 0;

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || product.hasVariants) {
      // For out of stock or variants, redirect to product page
      router.push(`/${locale}/products/${product._id}`);
      return;
    }

    // Add to cart
    addItem({
      productId: product._id,
      storeId: storeId || '',
      storeName: storeName || subdomain,
      storeSubdomain: subdomain,
      name: product.name,
      nameLocalized: product.nameLocalized,
      price: product.price,
      salePrice: product.salePrice,
      isOnSale: product.isOnSale,
      quantity: 1,
      image: product.images?.[0],
    });

    // Redirect to checkout
    router.push(`/${locale}/checkout`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || product.hasVariants) {
      // For out of stock or variants, redirect to product page
      router.push(`/${locale}/products/${product._id}`);
      return;
    }

    // Add to cart
    addItem({
      productId: product._id,
      storeId: storeId || '',
      storeName: storeName || subdomain,
      storeSubdomain: subdomain,
      name: product.name,
      nameLocalized: product.nameLocalized,
      price: product.price,
      salePrice: product.salePrice,
      isOnSale: product.isOnSale,
      quantity: 1,
      image: product.images?.[0],
    });
  };

  return (
    <div className="group bg-white dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
      {/* Product Image - Clickable */}
      <Link href={`/${locale}/products/${product._id}`} className="block">
        <div className="aspect-square relative bg-gray-100 dark:bg-zinc-700 overflow-hidden">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Sale Badge */}
          {hasDiscount && !isOutOfStock && (
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
      </Link>

      {/* Product Info */}
      <div className="p-3">
        <Link href={`/${locale}/products/${product._id}`}>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 min-h-[2.5rem] hover:text-[var(--store-accent-600)] transition-colors">
            {name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
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

        {/* Action Buttons */}
        {showBuyNow && (
          <div className="flex gap-2">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                isOutOfStock
                  ? 'bg-gray-200 dark:bg-zinc-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
              }`}
            >
              {product.hasVariants ? t('selectOptions') : t('addToCart')}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                isOutOfStock
                  ? 'bg-gray-300 dark:bg-zinc-600 text-gray-500 cursor-not-allowed'
                  : 'text-white'
              }`}
              style={
                !isOutOfStock
                  ? { backgroundColor: 'var(--store-accent-600)' }
                  : undefined
              }
            >
              {product.hasVariants ? t('view') : t('buyNow')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

