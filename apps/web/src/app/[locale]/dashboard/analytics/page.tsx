'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../lib/api';
import Image from 'next/image';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalProductsSold: number;
    conversionRate: number;
  };
  revenueOverTime: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  orderStatusBreakdown: Record<string, number>;
  topProducts: Array<{
    productId: string;
    name: string;
    image?: string;
    totalSold: number;
    revenue: number;
  }>;
  customerInsights: {
    totalCustomers: number;
    repeatCustomers: number;
    newCustomers: number;
    repeatRate: number;
  };
  recentOrders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  periodComparison: {
    revenueChange: number;
    ordersChange: number;
    customersChange: number;
  };
}

function AnalyticsContent() {
  const t = useTranslations('sellerAnalytics');
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const result = await api.get<AnalyticsData>(
          `/stores/analytics?period=${period}`,
        );
        setData(result);
      } catch (err: unknown) {
        console.error('Failed to fetch analytics:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch analytics',
        );
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [period]);

  const maxRevenue = useMemo(() => {
    if (!data?.revenueOverTime?.length) return 1;
    return Math.max(...data.revenueOverTime.map((d) => d.revenue), 1);
  }, [data]);

  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
    },
    paid: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
    },
    processing: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-400',
    },
    shipped: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-400',
    },
    delivered: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
    },
    cancelled: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-500)] border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const hasData =
    data && (data.overview.totalOrders > 0 || data.overview.totalRevenue > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
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

      {!hasData ? (
        /* Empty State */
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-zinc-700">
          <div className="w-20 h-20 mx-auto mb-6 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-[var(--accent-600)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('noDataTitle')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {t('noDataDescription')}
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t('totalRevenue')}
              value={`₾${data!.overview.totalRevenue.toLocaleString()}`}
              change={data!.periodComparison.revenueChange}
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              color="green"
            />
            <StatCard
              title={t('totalOrders')}
              value={data!.overview.totalOrders.toString()}
              change={data!.periodComparison.ordersChange}
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              }
              color="blue"
            />
            <StatCard
              title={t('avgOrderValue')}
              value={`₾${data!.overview.averageOrderValue.toFixed(2)}`}
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              }
              color="purple"
            />
            <StatCard
              title={t('productsSold')}
              value={data!.overview.totalProductsSold.toString()}
              icon={
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              }
              color="orange"
            />
          </div>

          {/* Revenue Chart */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('revenueOverTime')}
            </h3>
            {data!.revenueOverTime.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {t('noDataForPeriod')}
              </div>
            ) : (
              <div className="h-64 flex items-end gap-1">
                {data!.revenueOverTime.map((day, idx) => (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center group relative"
                  >
                    <div
                      className="w-full bg-[var(--accent-500)] rounded-t transition-all hover:bg-[var(--accent-600)] cursor-pointer"
                      style={{
                        height: `${Math.max((day.revenue / maxRevenue) * 100, 2)}%`,
                        minHeight: '4px',
                      }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 dark:bg-zinc-700 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                        <div className="font-medium">{day.date}</div>
                        <div>₾{day.revenue.toFixed(2)}</div>
                        <div>
                          {day.orders} {t('orders')}
                        </div>
                      </div>
                    </div>
                    {data!.revenueOverTime.length <= 14 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 transform rotate-45 origin-left truncate max-w-[40px]">
                        {day.date.slice(5)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('topProducts')}
              </h3>
              {data!.topProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {t('noProductsYet')}
                </div>
              ) : (
                <div className="space-y-3">
                  {data!.topProducts.slice(0, 5).map((product, idx) => (
                    <div
                      key={product.productId}
                      className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg"
                    >
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)] text-[var(--accent-600)] dark:text-[var(--accent-400)] text-sm font-medium">
                        {idx + 1}
                      </span>
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-600 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {product.totalSold} {t('sold')}
                        </p>
                      </div>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ₾{product.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Status Breakdown */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('orderStatus')}
              </h3>
              {Object.keys(data!.orderStatusBreakdown).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {t('noOrdersYet')}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data!.orderStatusBreakdown).map(
                    ([status, count]) => {
                      const total = Object.values(
                        data!.orderStatusBreakdown,
                      ).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      const colors =
                        statusColors[status] || statusColors.pending;

                      return (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                            >
                              {t(`status.${status}`)}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent-500)] transition-all"
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

          {/* Customer Insights & Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Insights */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('customerInsights')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {data!.customerInsights.totalCustomers}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('totalCustomers')}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-xl">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {data!.customerInsights.repeatRate.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('repeatRate')}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {data!.customerInsights.newCustomers}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('newCustomers')}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {data!.customerInsights.repeatCustomers}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('repeatCustomers')}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('recentOrders')}
              </h3>
              {data!.recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {t('noOrdersYet')}
                </div>
              ) : (
                <div className="space-y-3">
                  {data!.recentOrders.map((order) => {
                    const colors =
                      statusColors[order.status] || statusColors.pending;
                    return (
                      <div
                        key={order.orderId}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            #{order.orderNumber}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {order.customerName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ₾{order.total.toFixed(2)}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                          >
                            {t(`status.${order.status}`)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
  color,
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const colorClasses = {
    green:
      'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple:
      'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange:
      'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>{icon}</div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              change >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {change >= 0 ? (
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
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            ) : (
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
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
            {Math.abs(change).toFixed(0)}%
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {value}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.SELLER]}>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
