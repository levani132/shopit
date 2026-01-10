'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../../../../contexts/AuthContext';
import { getLocalizedText } from '../../../../../lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface OrderItem {
  productId: string;
  name: string;
  nameEn?: string;
  image: string;
  qty: number;
  price: number;
  variantAttributes?: Array<{
    attributeName: string;
    value: string;
  }>;
}

interface Order {
  _id: string;
  orderItems: OrderItem[];
  totalPrice: number;
  status: string;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt: string;
  shippingDetails: {
    address: string;
    city: string;
    country: string;
  };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export default function OrdersPage() {
  const t = useTranslations('orders');
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (authLoading) return;
      if (!isAuthenticated) {
        console.log('[Orders] Not authenticated, skipping fetch');
        setLoading(false);
        return;
      }

      try {
        console.log('[Orders] Fetching orders from:', `${API_URL}/api/v1/orders/my-orders`);
        const response = await fetch(`${API_URL}/api/v1/orders/my-orders`, {
          credentials: 'include',
        });

        console.log('[Orders] Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Orders] Received orders:', data.length, data);
          setOrders(data);
        } else {
          const errorText = await response.text();
          console.error('[Orders] Failed to load orders:', response.status, errorText);
          setError('Failed to load orders');
        }
      } catch (err) {
        console.error('[Orders] Error fetching orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48 mx-auto mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-zinc-700 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('loginRequired')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('loginRequiredDescription')}
        </p>
        <Link
          href={`/${locale}/login?returnUrl=/${locale}/orders`}
          className="inline-block px-6 py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
        >
          {t('login')}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('noOrders')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('noOrdersDescription')}
        </p>
        <Link
          href={`/${locale}/products`}
          className="inline-block px-6 py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
        >
          {t('startShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        {t('title')}
      </h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order._id}
            className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden"
          >
            {/* Order Header */}
            <div className="p-4 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('orderNumber')}
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">
                    {order._id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('orderDate')}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(order.createdAt).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || statusColors.pending}`}
                  >
                    {t(`status.${order.status}`)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="p-4 space-y-4">
              {order.orderItems.map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700 flex-shrink-0">
                    <Image
                      src={item.image || '/placeholder.webp'}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {locale === 'en' && item.nameEn ? item.nameEn : item.name}
                    </p>
                    {item.variantAttributes &&
                      item.variantAttributes.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.variantAttributes
                            .map((a) => `${a.attributeName}: ${a.value}`)
                            .join(', ')}
                        </p>
                      )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        x{item.qty}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        ₾{(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {order.shippingDetails.city}, {order.shippingDetails.country}
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('total')}: ₾{order.totalPrice.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

