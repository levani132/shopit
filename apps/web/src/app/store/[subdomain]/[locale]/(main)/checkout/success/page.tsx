'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCart } from '../../../../../../../contexts/CartContext';
import { useCheckout } from '../../../../../../../contexts/CheckoutContext';

export default function CheckoutSuccessPage() {
  const t = useTranslations('checkout');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ka';
  const subdomain = params?.subdomain as string;
  const orderId = searchParams.get('orderId');

  const { clearCart } = useCart();
  const { clearCheckout } = useCheckout();

  // Clear cart and checkout on mount (in case redirect happened before we could clear)
  useEffect(() => {
    clearCart();
    clearCheckout();
  }, [clearCart, clearCheckout]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        {t('successTitle')}
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        {t('successDescription')}
      </p>

      {orderId && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
          {t('orderNumber')}: <span className="font-mono">{orderId}</span>
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href={`/store/${subdomain}/${locale}/products`}
          className="inline-block px-6 py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
        >
          {t('continueShopping')}
        </Link>

        <Link
          href={`/store/${subdomain}/${locale}/orders`}
          className="inline-block px-6 py-3 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {t('viewOrders')}
        </Link>
      </div>
    </div>
  );
}

