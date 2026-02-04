'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// API response structure from courier-admin.service.ts
interface ApiAnalyticsResponse {
  stats: {
    totalCouriers: number;
    availableCouriers: number;
    busyCouriers: number;
    offlineCouriers: number;
    pendingOrders: number;
    inProgressOrders: number;
    overdueOrders: number;
    approachingDeadlineOrders: number;
    onTimeRate: number;
    avgDeliveryTime: number;
  };
  urgentOrders: Array<{
    id: string;
    orderNumber: string;
    deadline: string;
    status: string;
    isOverdue: boolean;
    courier?: {
      firstName: string;
      lastName: string;
    };
  }>;
  topCouriers: Array<{
    _id: string;
    name: string;
    deliveries: number;
    onTimeRate: number;
    avgDeliveryTime: number;
  }>;
  statusSummary: {
    available: number;
    busy: number;
    inactive: number;
    completedToday: number;
  };
}

// Transformed data for UI
interface CourierAnalytics {
  totalCouriers: number;
  availableCouriers: number;
  busyCouriers: number;
  inactiveCouriers: number;
  pendingDeliveries: number;
  inProgressDeliveries: number;
  completedToday: number;
  overdueOrders: number;
  approachingDeadlineOrders: number;
  averageDeliveryTime: number;
  onTimeRate: number;
}

interface TopCourier {
  _id: string;
  name: string;
  deliveries: number;
  onTimeRate: number;
  avgDeliveryTime: number;
}

interface UrgentOrder {
  id: string;
  orderNumber: string;
  deadline: string;
  status: string;
  isOverdue: boolean;
  courierName?: string;
}

function CourierAdminDashboardContent() {
  const t = useTranslations('courierAdmin');
  const tCommon = useTranslations('common');
  const params = useParams();
  const locale = params.locale as string;

  const [analytics, setAnalytics] = useState<CourierAnalytics | null>(null);
  const [topCouriers, setTopCouriers] = useState<TopCourier[]>([]);
  const [urgentOrders, setUrgentOrders] = useState<UrgentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await api.get<ApiAnalyticsResponse>(
        '/courier-admin/analytics',
      );

      // Transform API response to UI format
      setAnalytics({
        totalCouriers: data.stats.totalCouriers,
        availableCouriers: data.stats.availableCouriers,
        busyCouriers: data.stats.busyCouriers,
        inactiveCouriers: data.stats.offlineCouriers,
        pendingDeliveries: data.stats.pendingOrders,
        inProgressDeliveries: data.stats.inProgressOrders,
        completedToday: data.statusSummary.completedToday,
        overdueOrders: data.stats.overdueOrders,
        approachingDeadlineOrders: data.stats.approachingDeadlineOrders,
        averageDeliveryTime: data.stats.avgDeliveryTime,
        onTimeRate: data.stats.onTimeRate,
      });
      setTopCouriers(data.topCouriers || []);
      setUrgentOrders(
        (data.urgentOrders || []).map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          deadline: order.deadline,
          status: order.status,
          isOverdue: order.isOverdue,
          courierName: order.courier
            ? `${order.courier.firstName} ${order.courier.lastName}`
            : undefined,
        })),
      );
    } catch (err: unknown) {
      console.error('Failed to fetch courier analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getDeadlineUrgency = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMinutes = (deadlineDate.getTime() - now.getTime()) / (1000 * 60);

    if (diffMinutes < 0) return 'overdue';
    if (diffMinutes < 30) return 'critical';
    if (diffMinutes < 60) return 'warning';
    return 'normal';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
        >
          {tCommon('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/${locale}/dashboard/courier-admin/couriers`}
            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
          >
            {t('manageCouriers')}
          </Link>
          <Link
            href={`/${locale}/dashboard/courier-admin/orders`}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            {t('viewAllOrders')}
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Couriers Overview */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('totalCouriers')}
            </span>
            <svg
              className="w-5 h-5 text-cyan-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {analytics?.totalCouriers || 0}
          </p>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-green-600 dark:text-green-400">
              {analytics?.availableCouriers || 0} {t('available')}
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              {analytics?.busyCouriers || 0} {t('busy')}
            </span>
          </div>
        </div>

        {/* Pending Deliveries */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('pendingDeliveries')}
            </span>
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {analytics?.pendingDeliveries || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {analytics?.inProgressDeliveries || 0} {t('inProgress')}
          </p>
        </div>

        {/* Urgent Orders */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('urgentOrders')}
            </span>
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
            {(analytics?.overdueOrders || 0) +
              (analytics?.approachingDeadlineOrders || 0)}
          </p>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-red-600 dark:text-red-400">
              {analytics?.overdueOrders || 0} {t('overdue')}
            </span>
            <span className="text-orange-600 dark:text-orange-400">
              {analytics?.approachingDeadlineOrders || 0} {t('approaching')}
            </span>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('onTimeRate')}
            </span>
            <svg
              className="w-5 h-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {analytics?.onTimeRate
              ? `${Math.round(analytics.onTimeRate)}%`
              : 'N/A'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('avgTime')}:{' '}
            {analytics?.averageDeliveryTime
              ? formatTime(analytics.averageDeliveryTime)
              : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Orders List */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('urgentOrdersList')}
            </h2>
            <Link
              href={`/${locale}/dashboard/courier-admin/orders?urgent=true`}
              className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>

          {urgentOrders.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 text-green-500 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">
                {t('noUrgentOrders')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentOrders.slice(0, 5).map((order, index) => {
                const urgency = getDeadlineUrgency(order.deadline);
                const getStatusLabel = (status: string) => {
                  const statusMap: Record<string, string> = {
                    pending: t('pending'),
                    assigned: t('assigned'),
                    ready_for_delivery: t('readyForDelivery'),
                    in_transit: t('inTransit'),
                    delivered: t('delivered'),
                  };
                  return statusMap[status] || status;
                };
                return (
                  <div
                    key={order.id || `urgent-order-${index}`}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      urgency === 'overdue'
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : urgency === 'critical'
                          ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                          : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        #{order.orderNumber}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {order.courierName || t('unassigned')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-medium ${
                          urgency === 'overdue'
                            ? 'text-red-600 dark:text-red-400'
                            : urgency === 'critical'
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                        }`}
                      >
                        {urgency === 'overdue'
                          ? t('overdue')
                          : new Date(order.deadline).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getStatusLabel(order.status)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Couriers */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('topCouriers')}
            </h2>
            <Link
              href={`/${locale}/dashboard/courier-admin/couriers`}
              className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>

          {topCouriers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {t('noCouriersYet')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCouriers.slice(0, 5).map((courier, index) => (
                <div
                  key={courier._id || `top-courier-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? 'bg-yellow-500 text-white'
                          : index === 1
                            ? 'bg-gray-400 text-white'
                            : index === 2
                              ? 'bg-amber-600 text-white'
                              : 'bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {courier.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {courier.deliveries} {t('deliveries')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      {Math.round(courier.onTimeRate)}% {t('onTime')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('avg')} {formatTime(courier.avgDeliveryTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Courier Status Summary */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('courierStatusSummary')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {analytics?.availableCouriers || 0}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              {t('availableNow')}
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {analytics?.busyCouriers || 0}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              {t('currentlyDelivering')}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              {analytics?.inactiveCouriers || 0}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('inactiveToday')}
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {analytics?.completedToday || 0}
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
              {t('completedToday')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CourierAdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.COURIER_ADMIN]}>
      <CourierAdminDashboardContent />
    </ProtectedRoute>
  );
}
