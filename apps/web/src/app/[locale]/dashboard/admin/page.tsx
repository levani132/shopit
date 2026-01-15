'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../components/auth/ProtectedRoute';
import { Role } from '@sellit/constants';
import { api } from '../../../../lib/api';

interface DashboardStats {
  users: {
    total: number;
    sellers: number;
    couriers: number;
    todayNew: number;
  };
  stores: {
    total: number;
    published: number;
    pendingReview: number;
    todayNew: number;
  };
  orders: {
    total: number;
    pending: number;
    paid: number;
    delivered: number;
    todayNew: number;
  };
  revenue: {
    total: number;
  };
  pendingApprovals: {
    stores: number;
    couriers: number;
  };
}

function AdminDashboardContent() {
  const t = useTranslations('admin');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await api.get('/admin/dashboard');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch statistics');
        }
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        console.error('Failed to fetch admin stats:', err);
        setError(err.message || 'Failed to fetch statistics');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

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

  const StatCard = ({
    title,
    value,
    subtitle,
    color = 'blue',
    icon,
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red';
    icon?: React.ReactNode;
  }) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      green:
        'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      purple:
        'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      yellow:
        'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    };

    const textColors = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      purple: 'text-purple-600 dark:text-purple-400',
      yellow: 'text-yellow-600 dark:text-yellow-400',
      red: 'text-red-600 dark:text-red-400',
    };

    return (
      <div className={`p-6 rounded-xl border ${colors[color]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className={`text-3xl font-bold mt-1 ${textColors[color]}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {icon && (
            <div className={`${textColors[color]} opacity-50`}>{icon}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('dashboardTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('dashboardDescription')}
        </p>
      </div>

      {/* Pending Approvals Alert */}
      {stats &&
        (stats.pendingApprovals.stores > 0 ||
          stats.pendingApprovals.couriers > 0) && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="font-medium text-yellow-700 dark:text-yellow-400">
                {t('pendingApprovalsAlert', {
                  stores: stats.pendingApprovals.stores,
                  couriers: stats.pendingApprovals.couriers,
                })}
              </p>
            </div>
          </div>
        )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalUsers')}
          value={stats?.users.total || 0}
          subtitle={`+${stats?.users.todayNew || 0} ${t('today')}`}
          color="blue"
        />
        <StatCard
          title={t('totalStores')}
          value={stats?.stores.total || 0}
          subtitle={`${stats?.stores.published || 0} ${t('published')}`}
          color="purple"
        />
        <StatCard
          title={t('totalOrders')}
          value={stats?.orders.total || 0}
          subtitle={`+${stats?.orders.todayNew || 0} ${t('today')}`}
          color="green"
        />
        <StatCard
          title={t('totalRevenue')}
          value={`₾${(stats?.revenue.total || 0).toLocaleString()}`}
          color="yellow"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Breakdown */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('usersBreakdown')}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {t('sellers')}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats?.users.sellers || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {t('couriers')}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats?.users.couriers || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {t('regularUsers')}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {(stats?.users.total || 0) -
                  (stats?.users.sellers || 0) -
                  (stats?.users.couriers || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Orders Breakdown */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('ordersBreakdown')}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {t('pending')}
              </span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                {stats?.orders.pending || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {t('paid')}
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {stats?.orders.paid || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                {t('delivered')}
              </span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {stats?.orders.delivered || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('quickActions')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a
            href="/dashboard/admin/pending-stores"
            className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2">
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('reviewStores')}
            </span>
            {stats && stats.pendingApprovals.stores > 0 && (
              <span className="mt-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                {stats.pendingApprovals.stores}
              </span>
            )}
          </a>
          <a
            href="/dashboard/admin/pending-couriers"
            className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
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
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('reviewCouriers')}
            </span>
            {stats && stats.pendingApprovals.couriers > 0 && (
              <span className="mt-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                {stats.pendingApprovals.couriers}
              </span>
            )}
          </a>
          <a
            href="/dashboard/admin/settings"
            className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('siteSettings')}
            </span>
          </a>
          <a
            href="/dashboard/admin/analytics"
            className="flex flex-col items-center p-4 rounded-lg bg-gray-50 dark:bg-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-600 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-2">
              <svg
                className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
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
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('viewAnalytics')}
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
