'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

// Inline SVG Icons
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);

const UserCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

const EnvelopeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
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
);

const TruckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7h12l2 5h-2v4a1 1 0 01-1 1h-1a2 2 0 01-4 0H8a2 2 0 01-4 0H3a1 1 0 01-1-1v-4H1V7a1 1 0 011-1h6zm0 0V5a1 1 0 011-1h4a1 1 0 011 1v2"
    />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
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
);

const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
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
);

const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
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
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

interface CourierDetails {
  profile: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    isApproved: boolean;
    createdAt: string;
    lastActivity?: string;
    status: 'available' | 'busy' | 'offline';
  };
  stats: {
    totalDelivered: number;
    deliveredToday: number;
    deliveredThisWeek: number;
    deliveredThisMonth: number;
    activeDeliveries: number;
    onTimeRate: number;
    averageDeliveryTimeMinutes: number;
  };
  recentDeliveries: Array<{
    _id: string;
    orderNumber: string;
    status: string;
    customer: string;
    total: number;
    createdAt: string;
    deliveredAt?: string;
    isOnTime?: boolean | null;
  }>;
  dailyDeliveriesChart: Array<{
    date: string;
    count: number;
  }>;
}

function CourierDetailsContent() {
  const params = useParams();
  const { impersonateUser } = useAuth();
  const t = useTranslations('courierAdmin.courierDetails');
  const tCommon = useTranslations('common');
  const courierId = params.id as string;
  const locale = params.locale as string;

  const [courier, setCourier] = useState<CourierDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  const fetchCourierDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<CourierDetails>(
        `/courier-admin/couriers/${courierId}`,
      );
      setCourier(data);
    } catch (err) {
      console.error('Failed to fetch courier details:', err);
      setError('Failed to load courier details');
    } finally {
      setLoading(false);
    }
  }, [courierId]);

  useEffect(() => {
    if (courierId) {
      fetchCourierDetails();
    }
  }, [courierId, fetchCourierDetails]);

  const handleImpersonate = async () => {
    if (!courier) return;
    try {
      setImpersonating(true);
      await impersonateUser(courier.profile._id);
    } catch (err) {
      console.error('Failed to impersonate:', err);
      setImpersonating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'busy':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'offline':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'picked_up':
      case 'assigned_to_courier':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      locale === 'ka' ? 'ka-GE' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
    );
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTimeAgo = (date: string) => {
    if (!date) return t('never');
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('hoursAgo', { count: diffHours });
    return t('daysAgo', { count: diffDays });
  };

  // Calculate max for chart
  const maxDeliveries = courier?.dailyDeliveriesChart
    ? Math.max(...courier.dailyDeliveriesChart.map((d) => d.count), 1)
    : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (error || !courier) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          {error || 'Courier not found'}
        </h3>
        <Link
          href={`/${locale}/dashboard/courier-admin/couriers`}
          className="mt-4 inline-flex items-center text-cyan-600 hover:text-cyan-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          {t('backToList')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/dashboard/courier-admin/couriers`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {courier.profile.firstName} {courier.profile.lastName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{t('title')}</p>
          </div>
        </div>
        <button
          onClick={handleImpersonate}
          disabled={impersonating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors"
        >
          <UserIcon className="h-4 w-4" />
          {impersonating ? tCommon('loading') : t('impersonate')}
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <UserCircleIcon className="h-10 w-10 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {courier.profile.firstName} {courier.profile.lastName}
              </h2>
              <span
                className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                  courier.profile.status,
                )}`}
              >
                {t(courier.profile.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <EnvelopeIcon className="h-5 w-5" />
            <span>{courier.profile.email}</span>
          </div>
          {courier.profile.phoneNumber && (
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <PhoneIcon className="h-5 w-5" />
              <span>{courier.profile.phoneNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <CalendarIcon className="h-5 w-5" />
            <span>
              {t('memberSince')}: {formatDate(courier.profile.createdAt)}
            </span>
          </div>
        </div>

        {courier.profile.lastActivity && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <ClockIcon className="h-4 w-4" />
            {t('lastActive')}: {getTimeAgo(courier.profile.lastActivity)}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TruckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {courier.stats.totalDelivered}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('totalCompleted')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {courier.stats.onTimeRate}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('onTimeRate')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ClockIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatTime(courier.stats.averageDeliveryTimeMinutes)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('averageTime')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <TruckIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {courier.stats.activeDeliveries}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('activeDeliveries')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-4 text-center">
          <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
            {courier.stats.deliveredToday}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('completedToday')}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-4 text-center">
          <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
            {courier.stats.deliveredThisWeek}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('completedThisWeek')}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-4 text-center">
          <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
            {courier.stats.deliveredThisMonth}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('completedThisMonth')}
          </p>
        </div>
      </div>

      {/* Chart and Recent Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Deliveries Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-cyan-600" />
            {t('weeklyChart')}
          </h3>
          {courier.dailyDeliveriesChart.length > 0 ? (
            <div className="flex items-end justify-between h-48 gap-2">
              {courier.dailyDeliveriesChart.map((day, index) => (
                <div
                  key={day.date || index}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full bg-cyan-500 rounded-t-lg transition-all duration-300"
                    style={{
                      height: `${(day.count / maxDeliveries) * 100}%`,
                      minHeight: day.count > 0 ? '8px' : '0',
                    }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {new Date(day.date).toLocaleDateString(
                      locale === 'ka' ? 'ka-GE' : 'en-US',
                      { weekday: 'short' },
                    )}
                  </span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {day.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              {t('noDeliveries')}
            </div>
          )}
        </div>

        {/* Recent Deliveries */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-cyan-600" />
            {t('recentDeliveries')}
          </h3>
          {courier.recentDeliveries.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {courier.recentDeliveries.map((order, index) => (
                <div
                  key={order._id || index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      #{order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.customer}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getOrderStatusColor(
                        order.status,
                      )}`}
                    >
                      {order.status}
                    </span>
                    {order.isOnTime !== null &&
                      order.status === 'delivered' && (
                        <p className="text-xs mt-1">
                          {order.isOnTime ? (
                            <span className="text-green-600">
                              ✓ {t('onTime')}
                            </span>
                          ) : (
                            <span className="text-red-600">✗ {t('late')}</span>
                          )}
                        </p>
                      )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              {t('noDeliveries')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CourierDetailsPage() {
  return (
    <div className="p-6">
      <CourierDetailsContent />
    </div>
  );
}
