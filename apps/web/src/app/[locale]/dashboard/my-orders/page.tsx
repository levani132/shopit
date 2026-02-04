'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import { OrderCard, Order } from '../../../../components/orders';
import { api } from '../../../../lib/api';

export default function MyOrdersPage() {
  const t = useTranslations('dashboard');
  const tOrders = useTranslations('orders');
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';
  const { user, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await api.get<Order[] | { orders: Order[] }>('/api/v1/orders/my-orders');
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      const message = err instanceof Error && 'message' in err ? (err as any).message : 'Failed to load orders';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [authLoading, user, fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (showCancelled) return orders;
    return orders.filter((order) => order.status !== 'cancelled');
  }, [orders, showCancelled]);

  const hasCancelledOrders = useMemo(() => {
    return orders.some((order) => order.status === 'cancelled');
  }, [orders]);

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-zinc-700 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('allMyOrders')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('allMyOrdersDescription')}
          </p>
        </div>
        {hasCancelledOrders && (
          <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="form-checkbox h-4 w-4 text-[var(--accent-500)] rounded border-gray-300 dark:border-zinc-600"
            />
            <span className="text-sm">{tOrders('showCancelledOrders')}</span>
          </label>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('noOrders')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('noOrdersDescription')}
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
          <p className="text-gray-600 dark:text-gray-400">
            {tOrders('onlyCancelledOrders')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              locale={locale}
              t={tOrders}
              showStoreName={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
