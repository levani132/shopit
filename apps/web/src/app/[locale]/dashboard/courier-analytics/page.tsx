'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth, hasRole, Role } from '../../../../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface AnalyticsData {
  totalDeliveries: number;
  totalEarnings: number;
  thisWeek: {
    deliveries: number;
    earnings: number;
  };
  thisMonth: {
    deliveries: number;
    earnings: number;
  };
  dailyStats: Array<{
    date: string;
    deliveries: number;
    earnings: number;
  }>;
}

export default function CourierAnalyticsPage() {
  const t = useTranslations('courier');
  const tDash = useTranslations('dashboard');
  const { user, isLoading: authLoading } = useAuth();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>(
    'week',
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasRole(user.role ?? 0, Role.COURIER)) {
      setError('You must be a courier to access this page');
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/v1/analytics/courier?period=${period}`,
          { credentials: 'include' },
        );
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        } else {
          // Use mock data if endpoint doesn't exist yet
          setAnalytics({
            totalDeliveries: 0,
            totalEarnings: user.totalEarnings || 0,
            thisWeek: { deliveries: 0, earnings: 0 },
            thisMonth: { deliveries: 0, earnings: 0 },
            dailyStats: [],
          });
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        // Use mock data on error
        setAnalytics({
          totalDeliveries: 0,
          totalEarnings: user.totalEarnings || 0,
          thisWeek: { deliveries: 0, earnings: 0 },
          thisMonth: { deliveries: 0, earnings: 0 },
          dailyStats: [],
        });
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

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('courierAnalytics')}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {tDash('analyticsDescription')}
      </p>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('thisWeek')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics?.thisWeek.deliveries || 0} / ₾
            {analytics?.thisWeek.earnings.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-purple-600 dark:text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t('thisMonth')}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {analytics?.thisMonth.deliveries || 0} / ₾
            {analytics?.thisMonth.earnings.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {tDash('earningsChart')}
        </h2>
        {analytics?.dailyStats && analytics.dailyStats.length > 0 ? (
          <div className="h-64 flex items-end justify-around gap-2">
            {analytics.dailyStats.map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 bg-indigo-500 rounded-t"
                  style={{
                    height: `${Math.max(20, (stat.earnings / (analytics.totalEarnings || 1)) * 200)}px`,
                  }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
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
    </div>
  );
}
