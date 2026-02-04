'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import { Role, hasRole } from '@shopit/constants';
import { api } from '../../../../lib/api';

interface AnalyticsData {
  totalDeliveries: number;
  totalEarnings: number;
  totalRoutes: number;
  thisWeek: {
    deliveries: number;
    earnings: number;
    routes: number;
  };
  thisMonth: {
    deliveries: number;
    earnings: number;
    routes: number;
  };
  averageDeliveriesPerRoute: number;
  averageEarningsPerDelivery: number;
  averageHandlingTimeMinutes: number;
  averageRouteTimeMinutes: number;
  onTimeDeliveryRate: number;
  dailyStats: Array<{
    date: string;
    deliveries: number;
    earnings: number;
    routes: number;
  }>;
  recentRoutes: Array<{
    _id: string;
    completedAt: string;
    deliveries: number;
    earnings: number;
    duration: number;
  }>;
}

// Georgian month names for proper localized date formatting
const georgianMonths = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
];

function formatDateLocalized(dateString: string, locale: string): string {
  const date = new Date(dateString);
  if (locale === 'ka') {
    const day = date.getDate();
    const month = georgianMonths[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month}, ${hours}:${minutes}`;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function CourierAnalyticsPage() {
  const t = useTranslations('courier');
  const tDash = useTranslations('dashboard');
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>(
    'week',
  );

  const emptyAnalytics: AnalyticsData = {
    totalDeliveries: 0,
    totalEarnings: 0,
    totalRoutes: 0,
    thisWeek: { deliveries: 0, earnings: 0, routes: 0 },
    thisMonth: { deliveries: 0, earnings: 0, routes: 0 },
    averageDeliveriesPerRoute: 0,
    averageEarningsPerDelivery: 0,
    averageHandlingTimeMinutes: 0,
    averageRouteTimeMinutes: 0,
    onTimeDeliveryRate: 100,
    dailyStats: [],
    recentRoutes: [],
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasRole(user.role ?? 0, Role.COURIER)) {
      setError('You must be a courier to access this page');
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const data = await api.get(`/api/v1/analytics/courier?period=${period}`);
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setAnalytics(emptyAnalytics);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [authLoading, user, period]);

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-zinc-700 rounded-xl"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-zinc-700 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Calculate max earnings for chart scaling
  const maxDailyEarnings = analytics?.dailyStats.length
    ? Math.max(...analytics.dailyStats.map((s) => s.earnings), 1)
    : 1;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('courierAnalytics')}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {tDash('analyticsDescription')}
      </p>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['week', 'month', 'year', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === p
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            {p === 'week'
              ? t('thisWeek')
              : p === 'month'
                ? t('thisMonth')
                : p === 'year'
                  ? tDash('thisYear')
                  : t('allTime')}
          </button>
        ))}
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Deliveries */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('totalDeliveries')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics?.totalDeliveries || 0}
          </p>
        </div>

        {/* Total Earnings */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {tDash('totalEarnings')}
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            ₾{analytics?.totalEarnings.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Total Routes */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('totalRoutes')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics?.totalRoutes || 0}
          </p>
        </div>

        {/* On-Time Rate */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('onTimeRate')}
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {analytics?.onTimeDeliveryRate || 100}%
          </p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* This Week */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📅</span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('thisWeek')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {analytics?.thisWeek.deliveries || 0} {t('deliveries')}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              ₾{analytics?.thisWeek.earnings.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {analytics?.thisWeek.routes || 0} {t('routes')}
            </p>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📆</span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('thisMonth')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {analytics?.thisMonth.deliveries || 0} {t('deliveries')}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              ₾{analytics?.thisMonth.earnings.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {analytics?.thisMonth.routes || 0} {t('routes')}
            </p>
          </div>
        </div>

        {/* Average Handling Time */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⏱️</span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('avgHandlingTime')}
            </p>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatDuration(analytics?.averageHandlingTimeMinutes || 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('perStop')}
          </p>
        </div>

        {/* Average Route Time */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🛣️</span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('avgRouteTime')}
            </p>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatDuration(analytics?.averageRouteTimeMinutes || 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {analytics?.averageDeliveriesPerRoute.toFixed(1) || 0}{' '}
            {t('deliveriesPerRoute')}
          </p>
        </div>
      </div>

      {/* Charts and Recent Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Earnings Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {tDash('earningsChart')}
          </h2>
          {analytics?.dailyStats && analytics.dailyStats.length > 0 ? (
            <div className="h-64 flex items-end justify-around gap-1 px-2">
              {analytics.dailyStats.slice(-14).map((stat, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-1 flex-1 group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    <div className="font-semibold text-green-400 dark:text-green-600">
                      ₾{stat.earnings.toFixed(2)}
                    </div>
                    <div className="text-gray-300 dark:text-gray-600">
                      {stat.deliveries} {t('deliveries')}
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 text-[10px]">
                      {new Date(stat.date).toLocaleDateString(
                        locale === 'ka' ? 'ka-GE' : 'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                        },
                      )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-white"></div>
                  </div>
                  <div
                    className="w-full max-w-8 bg-indigo-500 hover:bg-indigo-600 rounded-t transition-colors cursor-pointer"
                    style={{
                      height: `${Math.max(8, (stat.earnings / maxDailyEarnings) * 180)}px`,
                    }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {new Date(stat.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {tDash('noDataYet')}
            </div>
          )}
        </div>

        {/* Recent Routes */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('recentRoutes')}
          </h2>
          {analytics?.recentRoutes && analytics.recentRoutes.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {analytics.recentRoutes.map((route) => (
                <div
                  key={route._id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {route.deliveries} {t('deliveries')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateLocalized(route.completedAt, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      ₾{route.earnings.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDuration(route.duration)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {t('noRoutesYet')}
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-6 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('performanceSummary')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ₾{analytics?.averageEarningsPerDelivery.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('avgEarningsPerDelivery')}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics?.averageDeliveriesPerRoute.toFixed(1) || '0'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('avgDeliveriesPerRoute')}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatDuration(analytics?.averageHandlingTimeMinutes || 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('avgHandlingTime')}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatDuration(analytics?.averageRouteTimeMinutes || 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('avgRouteTime')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
