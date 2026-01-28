'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { EditButton } from './EditButton';

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
  variantsCount?: number; // Number of variants
  shippingSize?: 'small' | 'medium' | 'large' | 'extra_large'; // Shipping size category
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
  const { isAuthenticated } = useAuth();

  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Check wishlist status
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkWishlist = async () => {
      try {
        const data = await api.get(`/wishlist/check/${product._id}`);
        setIsInWishlist(data.isInWishlist);
      } catch (err) {
        // Silently fail
      }
    };

    checkWishlist();
  }, [isAuthenticated, product._id]);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/${locale}/login`);
      return;
    }

    setWishlistLoading(true);
    try {
      const data = await api.post(`/wishlist/${product._id}/toggle`, {});
      setIsInWishlist(data.added);
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    } finally {
      setWishlistLoading(false);
    }
  };

  const name = getLocalizedText(product.nameLocalized, product.name, locale);
  const hasDiscount =
    product.isOnSale && product.salePrice && product.salePrice < product.price;
  const displayPrice = hasDiscount ? product.salePrice : product.price;

  // Use totalStock for products with variants, otherwise use stock
  const effectiveStock = product.hasVariants
    ? (product.totalStock ?? 0)
    : product.stock;
  const isOutOfStock = effectiveStock <= 0;

  // Determine if we need to show "Choose Options" instead of direct buy buttons
  // Show choose options if product has more than 1 variant
  const needsOptionSelection =
    product.hasVariants && (product.variantsCount ?? 0) > 1;

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || product.hasVariants) {
      // For out of stock or variants, redirect to product page
      router.push(`/${locale}/products/${product._id}`);
      return;
    }

    // Add to cart
    addItem(
      {
        productId: product._id,
        storeId: storeId || '',
        storeName: storeName || subdomain,
        storeSubdomain: subdomain,
        name: product.name,
        nameLocalized: product.nameLocalized,
        price: product.price,
        salePrice: product.salePrice,
        isOnSale: product.isOnSale,
        image: product.images?.[0],
        stock: effectiveStock,
        shippingSize: product.shippingSize || 'small',
      },
      1,
    );

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
    addItem(
      {
        productId: product._id,
        storeId: storeId || '',
        storeName: storeName || subdomain,
        storeSubdomain: subdomain,
        name: product.name,
        nameLocalized: product.nameLocalized,
        price: product.price,
        salePrice: product.salePrice,
        isOnSale: product.isOnSale,
        image: product.images?.[0],
        stock: effectiveStock,
        shippingSize: product.shippingSize || 'small',
      },
      1,
    );
  };

  return (
    <div className="group bg-white dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
      {/* Product Image - Clickable */}
      <Link href={`/${locale}/products/${product._id}`} className="block">
        <div className="aspect-square relative bg-gray-100 dark:bg-zinc-700 overflow-hidden">
          {/* Edit Button - Always visible in edit mode */}
          <EditButton
            href={`/${locale}/dashboard/products/${product._id}`}
            title={t('editProduct') || 'Edit Product'}
            size="sm"
            variant="icon-only"
            className="absolute top-2 left-2 z-10"
          />

          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            disabled={wishlistLoading}
            className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full shadow-md transition-all ${
              isInWishlist
                ? 'bg-red-500 text-white'
                : 'bg-white/90 dark:bg-zinc-800/90 text-gray-600 dark:text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'
            }`}
          >
            {wishlistLoading ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill={isInWishlist ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            )}
          </button>

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
            {needsOptionSelection ? (
              /* Choose Options - Single full-width button for multi-variant products */
              <Link
                href={`/${locale}/products/${product._id}`}
                className={`flex-1 h-10 flex items-center justify-center gap-2 text-sm font-medium rounded-lg transition-colors ${
                  isOutOfStock
                    ? 'bg-gray-300 dark:bg-zinc-600 text-gray-500 cursor-not-allowed pointer-events-none'
                    : 'text-white'
                }`}
                style={
                  !isOutOfStock
                    ? { backgroundColor: 'var(--store-accent-600)' }
                    : undefined
                }
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
                {t('chooseOptions')}
              </Link>
            ) : (
              <>
                {/* Add to Cart - Icon only */}
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  title={t('addToCart')}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                    isOutOfStock
                      ? 'bg-gray-200 dark:bg-zinc-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
                  }`}
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
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </button>
                {/* Buy Now - Takes rest of width */}
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`flex-1 h-10 px-4 text-sm font-medium rounded-lg transition-colors ${
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
                  {t('buyNow')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
