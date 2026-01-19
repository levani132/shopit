'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../../lib/api';

interface RevenueData {
  period: string;
  startDate: string;
  endDate: string;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
  totals: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
  };
}

interface StoreAnalytics {
  topStores: Array<{
    storeId: string;
    storeName: string;
    totalRevenue: number;
    orderCount: number;
    itemsSold: number;
  }>;
  statusDistribution: Record<string, number>;
}

function AnalyticsContent() {
  const t = useTranslations('admin');
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [storeAnalytics, setStoreAnalytics] = useState<StoreAnalytics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const [revenueRes, storeRes] = await Promise.all([
          api.get(`/admin/analytics/revenue?period=${period}`),
          api.get('/admin/analytics/stores'),
        ]);

        if (!revenueRes.ok || !storeRes.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const [revenueData, storeData] = await Promise.all([
          revenueRes.json(),
          storeRes.json(),
        ]);

        setRevenueData(revenueData);
        setStoreAnalytics(storeData);
      } catch (err: any) {
        console.error('Failed to fetch analytics:', err);
        setError(err.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-500)] border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const maxRevenue = Math.max(
    ...(revenueData?.dailyRevenue.map((d) => d.revenue) || [1]),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('platformAnalyticsTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('platformAnalyticsDescription')}
          </p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                period === p
                  ? 'bg-[var(--accent-500)] text-white'
                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
              }`}
            >
              {t(`period${p.charAt(0).toUpperCase() + p.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('totalRevenue')}
          </p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
            ₾{(revenueData?.totals.revenue || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('totalOrders')}
          </p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {revenueData?.totals.orders || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {t('avgOrderValue')}
          </p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            ₾{(revenueData?.totals.averageOrderValue || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('revenueChart')}
        </h3>
        {revenueData?.dailyRevenue.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {t('noDataForPeriod')}
          </div>
        ) : (
          <div className="h-64 flex items-end gap-1">
            {revenueData?.dailyRevenue.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[var(--accent-500)] rounded-t transition-all hover:bg-[var(--accent-600)]"
                  style={{
                    height: `${Math.max((day.revenue / maxRevenue) * 100, 2)}%`,
                    minHeight: '4px',
                  }}
                  title={`${day.date}: ₾${day.revenue.toFixed(2)} (${day.orderCount} orders)`}
                />
                {revenueData.dailyRevenue.length <= 14 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 transform rotate-45 origin-left">
                    {day.date.slice(5)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Stores & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stores */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('topStores')}
          </h3>
          {storeAnalytics?.topStores.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('noDataYet')}
            </div>
          ) : (
            <div className="space-y-3">
              {storeAnalytics?.topStores.map((store, idx) => (
                <div
                  key={store.storeId}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)] text-[var(--accent-600)] dark:text-[var(--accent-400)] text-sm font-medium">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {store.storeName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {store.orderCount} {t('orders')} · {store.itemsSold}{' '}
                        {t('items')}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ₾{store.totalRevenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Store Status Distribution */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('storeStatusDistribution')}
          </h3>
          {!storeAnalytics?.statusDistribution ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('noDataYet')}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(storeAnalytics.statusDistribution).map(
                ([status, count]) => {
                  const total = Object.values(
                    storeAnalytics.statusDistribution,
                  ).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? (count / total) * 100 : 0;

                  const statusColors: Record<string, string> = {
                    published: 'bg-green-500',
                    pending_review: 'bg-yellow-500',
                    draft: 'bg-gray-400',
                    rejected: 'bg-red-500',
                  };

                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300 capitalize">
                          {status.replace('_', ' ')}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${statusColors[status] || 'bg-gray-400'} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
