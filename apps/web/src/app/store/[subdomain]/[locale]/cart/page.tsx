'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '../../../../../contexts/CartContext';
import { getLocalizedText } from '../../../../../lib/utils';

export default function CartPage() {
  const t = useTranslations('cart');
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';

  const { items: cart, updateQuantity, removeItem, subtotal } = useCart();

  const total = subtotal;

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-gray-400 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('empty')}
        </h1>
        <Link
          href={`/${locale}/products`}
          className="inline-block px-6 py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
        >
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        {t('title')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div
              key={`${item.productId}-${item.variantId}`}
              className="flex gap-4 p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700"
            >
              {/* Product Image */}
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700 flex-shrink-0">
                <Image
                  src={item.image || '/placeholder.webp'}
                  alt={item.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/${locale}/products/${item.productId}`}
                  className="font-medium text-gray-900 dark:text-white hover:text-[var(--store-accent-600)] transition-colors line-clamp-2"
                >
                  {getLocalizedText(item.nameLocalized, item.name, locale)}
                </Link>

                {/* Variant Attributes */}
                {item.variantAttributes && item.variantAttributes.length > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {item.variantAttributes
                      .map((attr) => `${attr.attributeName}: ${attr.value}`)
                      .join(' • ')}
                  </p>
                )}

                {/* Price */}
                <div className="flex items-center gap-2 mt-2">
                  {item.isOnSale && item.salePrice ? (
                    <>
                      <span className="font-semibold text-[var(--store-accent-600)]">
                        ₾{item.salePrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-400 line-through">
                        ₾{item.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₾{item.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center border border-gray-300 dark:border-zinc-600 rounded-lg">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity - 1,
                        )
                      }
                      disabled={item.quantity <= 1}
                      className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      −
                    </button>
                    <span className="px-4 py-1 text-gray-900 dark:text-white font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity + 1,
                        )
                      }
                      className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-r-lg transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId, item.variantId)}
                    className="text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    {t('remove')}
                  </button>
                </div>
              </div>

              {/* Item Total */}
              <div className="text-right">
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₾{((item.isOnSale && item.salePrice ? item.salePrice : item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('subtotal')}
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </span>
                <span>₾{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 mb-6">
              <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white">
                <span>{t('subtotal')}</span>
                <span>₾{total.toFixed(2)}</span>
              </div>
            </div>

            <Link
              href={`/${locale}/checkout`}
              className="block w-full text-center py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors font-medium"
            >
              {t('checkout')}
            </Link>

            <Link
              href={`/${locale}/products`}
              className="block w-full text-center py-3 mt-3 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            >
              {t('continueShopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

