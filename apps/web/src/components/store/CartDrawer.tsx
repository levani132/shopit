'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useCart, CartItem } from '../../contexts/CartContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const t = useTranslations('cart');
  const locale = useLocale();
  const params = useParams();
  const subdomain = params?.subdomain as string;
  
  const {
    items,
    itemCount,
    subtotal,
    removeItem,
    updateQuantity,
    clearCart,
    getStoreItems,
  } = useCart();

  // Get items for the current store
  const storeItems = subdomain
    ? items.filter((item) => item.storeSubdomain === subdomain)
    : items;

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Get localized name
  const getLocalizedName = (item: CartItem) => {
    if (item.nameLocalized) {
      return locale === 'ka'
        ? item.nameLocalized.ka || item.name
        : item.nameLocalized.en || item.name;
    }
    return item.name;
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale === 'ka' ? 'ka-GE' : 'en-US', {
      style: 'currency',
      currency: 'GEL',
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 z-50 shadow-xl transform transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('title')} ({itemCount})
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-80px)]">
          {storeItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-300 dark:text-zinc-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('empty')}
              </p>
              <button
                onClick={onClose}
                className="text-[var(--store-accent-600)] hover:underline"
              >
                {t('continueShopping')}
              </button>
            </div>
          ) : (
            <>
              {/* Items list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {storeItems.map((item) => (
                  <CartItemCard
                    key={`${item.productId}-${item.variantId || 'base'}`}
                    item={item}
                    locale={locale}
                    onRemove={() => removeItem(item.productId, item.variantId)}
                    onUpdateQuantity={(qty) =>
                      updateQuantity(item.productId, item.variantId, qty)
                    }
                    formatPrice={formatPrice}
                    getLocalizedName={getLocalizedName}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-zinc-700 p-4 space-y-4">
                {/* Subtotal */}
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('subtotal')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {/* Checkout button */}
                <Link
                  href={`/${locale}/checkout`}
                  onClick={onClose}
                  className="block w-full py-3 px-4 bg-[var(--store-accent-600)] hover:bg-[var(--store-accent-700)] text-white text-center font-medium rounded-lg transition-colors"
                >
                  {t('checkout')}
                </Link>

                {/* Continue shopping */}
                <button
                  onClick={onClose}
                  className="block w-full py-2 text-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {t('continueShopping')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Individual cart item card
interface CartItemCardProps {
  item: CartItem;
  locale: string;
  onRemove: () => void;
  onUpdateQuantity: (qty: number) => void;
  formatPrice: (price: number) => string;
  getLocalizedName: (item: CartItem) => string;
}

function CartItemCard({
  item,
  locale,
  onRemove,
  onUpdateQuantity,
  formatPrice,
  getLocalizedName,
}: CartItemCardProps) {
  const effectivePrice = item.isOnSale && item.salePrice ? item.salePrice : item.price;
  const lineTotal = effectivePrice * item.quantity;

  return (
    <div className="flex gap-4 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
      {/* Image */}
      <div className="relative w-20 h-20 flex-shrink-0 bg-white dark:bg-zinc-700 rounded-lg overflow-hidden">
        {item.image ? (
          <Image
            src={item.image}
            alt={getLocalizedName(item)}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white truncate">
          {getLocalizedName(item)}
        </h3>

        {/* Variant attributes */}
        {item.variantAttributes && item.variantAttributes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.variantAttributes.map((attr) => (
              <span
                key={attr.valueId}
                className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              >
                {attr.colorHex && (
                  <span
                    className="w-3 h-3 rounded-full border border-gray-300 dark:border-zinc-600"
                    style={{ backgroundColor: attr.colorHex }}
                  />
                )}
                {attr.value}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-medium text-gray-900 dark:text-white">
            {formatPrice(effectivePrice)}
          </span>
          {item.isOnSale && item.salePrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(item.price)}
            </span>
          )}
        </div>

        {/* Quantity controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              disabled={item.quantity >= item.stock}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Remove button */}
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

