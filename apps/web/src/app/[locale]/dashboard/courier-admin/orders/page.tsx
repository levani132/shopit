'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../../lib/api';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

interface DeliveryOrder {
  _id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  deliveryDeadline?: string;
  deliveredAt?: string;
  isOverdue?: boolean;
  isApproachingDeadline?: boolean;
  courier?: {
    name: string;
  } | null;
  customer: {
    name: string;
  };
  total: number;
  shippingAddress?: {
    address?: string;
    city?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface QuickStats {
  pending: number;
  inProgress: number;
  overdue: number;
  deliveredToday: number;
}

function AllDeliveryOrdersContent() {
  const t = useTranslations('courierAdmin');
  const tCommon = useTranslations('common');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [quickStats, setQuickStats] = useState<QuickStats>({
    pending: 0,
    inProgress: 0,
    overdue: 0,
    deliveredToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'all',
  );
  const [dateFilter, setDateFilter] = useState<string>(
    searchParams.get('date') || 'all',
  );

  const fetchOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('page', String(page));
        queryParams.append('limit', '20');

        if (search.trim()) {
          queryParams.append('search', search.trim());
        }

        // Handle status filter - map frontend values to backend expectations
        if (statusFilter === 'urgent') {
          queryParams.append('urgentOnly', 'true');
        } else if (statusFilter === 'pending') {
          queryParams.append('status', 'ready_for_delivery');
        } else if (statusFilter === 'assigned') {
          queryParams.append('status', 'assigned_to_courier');
        } else if (statusFilter === 'in_transit') {
          queryParams.append('status', 'picked_up');
        } else if (statusFilter === 'delivered') {
          queryParams.append('status', 'delivered');
        }
        // 'all' doesn't add any status filter

        // Map date filter values
        if (dateFilter && dateFilter !== 'all') {
          const dateFilterMap: Record<string, string> = {
            today: 'today',
            yesterday: 'yesterday',
            week: 'thisWeek',
            month: 'thisMonth',
          };
          queryParams.append(
            'dateFilter',
            dateFilterMap[dateFilter] || dateFilter,
          );
        }

        const data = await api.get<{
          orders: DeliveryOrder[];
          pagination: Pagination;
          quickStats: QuickStats;
        }>(`/courier-admin/orders?${queryParams.toString()}`);

        setOrders(data.orders || []);
        setPagination(data.pagination);
        setQuickStats(data.quickStats);
      } catch (err: unknown) {
        console.error('Failed to fetch orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, dateFilter],
  );

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter, dateFilter, fetchOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchOrders(newPage);
  };

  const getStatusBadge = (status: string, isOverdue?: boolean) => {
    if (isOverdue) {
      return {
        label: t('overdue'),
        className:
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      };
    }

    const statusMap: Record<string, { label: string; className: string }> = {
      paid: {
        label: t('awaitingPickup'),
        className:
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      },
      processing: {
        label: t('processing'),
        className:
          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      },
      ready_for_delivery: {
        label: t('readyForDelivery'),
        className:
          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      },
      assigned_to_courier: {
        label: t('courierAssigned'),
        className:
          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      },
      picked_up: {
        label: t('inTransit'),
        className:
          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      },
      delivered: {
        label: t('delivered'),
        className:
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      },
      cancelled: {
        label: t('cancelled'),
        className:
          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
      },
    };

    return (
      statusMap[status] || {
        label: status,
        className:
          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
      }
    );
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString(locale === 'ka' ? 'ka-GE' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDeadline = (
    deadline?: string,
    isOverdue?: boolean,
    isApproaching?: boolean,
  ) => {
    if (!deadline) return { text: '-', className: 'text-gray-500' };

    const date = new Date(deadline);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    let text: string;
    let className: string;

    if (isOverdue || diffMs < 0) {
      const overdueMins = Math.abs(diffMins);
      if (overdueMins < 60) {
        text = t('overdueMinutes', { count: overdueMins });
      } else {
        text = t('overdueHours', { count: Math.floor(overdueMins / 60) });
      }
      className = 'text-red-600 dark:text-red-400 font-semibold';
    } else if (isApproaching || diffMins < 60) {
      text = t('inMinutes', { count: diffMins });
      className = 'text-orange-600 dark:text-orange-400 font-semibold';
    } else if (diffHours < 24) {
      text = t('inHours', { count: diffHours });
      className = 'text-yellow-600 dark:text-yellow-400';
    } else {
      text = formatDateTime(deadline);
      className = 'text-gray-600 dark:text-gray-400';
    }

    return { text, className };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ka' ? 'ka-GE' : 'en-US', {
      style: 'currency',
      currency: 'GEL',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link
              href={`/${locale}/dashboard/courier-admin`}
              className="hover:text-cyan-600 dark:hover:text-cyan-400"
            >
              {t('title')}
            </Link>
            <span>/</span>
            <span>{t('allDeliveryOrders')}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('allDeliveryOrders')}
          </h1>
        </div>
        <button
          onClick={() => fetchOrders(pagination.page)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
        >
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t('refresh')}
        </button>
      </div>

      {/* Quick Stats from API */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`text-left rounded-lg p-4 border transition-all ${
            statusFilter === 'pending'
              ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600 ring-2 ring-yellow-400'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:border-yellow-400'
          }`}
        >
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {quickStats.pending}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {t('pendingPickup')}
          </p>
        </button>

        <button
          onClick={() => setStatusFilter('assigned')}
          className={`text-left rounded-lg p-4 border transition-all ${
            statusFilter === 'assigned' || statusFilter === 'in_transit'
              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-400'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400'
          }`}
        >
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {quickStats.inProgress}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t('inProgress')}
          </p>
        </button>

        <button
          onClick={() => setStatusFilter('urgent')}
          className={`text-left rounded-lg p-4 border transition-all ${
            statusFilter === 'urgent'
              ? 'bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-600 ring-2 ring-red-400'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:border-red-400'
          }`}
        >
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {quickStats.overdue}
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            {t('overdueOrUrgent')}
          </p>
        </button>

        <button
          onClick={() => setStatusFilter('delivered')}
          className={`text-left rounded-lg p-4 border transition-all ${
            statusFilter === 'delivered'
              ? 'bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 ring-2 ring-green-400'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-400'
          }`}
        >
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {quickStats.deliveredToday}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            {t('deliveredToday')}
          </p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchByOrderNumber')}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    fetchOrders(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </form>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {t('status')}:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 min-w-[160px]"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="urgent">{t('urgentOverdue')}</option>
              <option value="pending">{t('readyForDelivery')}</option>
              <option value="assigned">{t('courierAssigned')}</option>
              <option value="in_transit">{t('inTransit')}</option>
              <option value="delivered">{t('delivered')}</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {t('period')}:
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 min-w-[140px]"
            >
              <option value="today">{t('today')}</option>
              <option value="yesterday">{t('yesterday')}</option>
              <option value="week">{t('thisWeek')}</option>
              <option value="month">{t('thisMonth')}</option>
              <option value="all">{t('allTime')}</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(statusFilter !== 'all' || dateFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setDateFilter('all');
                setSearch('');
              }}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-4"
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
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => fetchOrders(pagination.page)}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
            >
              {tCommon('retry')}
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {t('noOrdersFound')}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t('tryDifferentFilters')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-zinc-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('orderInfo')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('customer')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('courier')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('deadline')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('amount')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                  {orders.map((order) => {
                    const statusBadge = getStatusBadge(
                      order.status,
                      order.isOverdue,
                    );
                    const deadline = formatDeadline(
                      order.deliveryDeadline,
                      order.isOverdue,
                      order.isApproachingDeadline,
                    );

                    return (
                      <tr
                        key={order._id}
                        className={`hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors ${
                          order.isOverdue
                            ? 'bg-red-50/50 dark:bg-red-900/10'
                            : order.isApproachingDeadline
                              ? 'bg-orange-50/50 dark:bg-orange-900/10'
                              : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              #{order.orderNumber}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {order.customer?.name || '-'}
                            </p>
                            {order.shippingAddress?.city && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {order.shippingAddress.city}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {order.courier ? (
                            <span className="text-sm text-gray-900 dark:text-white">
                              {order.courier.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400 font-medium">
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
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                              {t('unassigned')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm ${deadline.className}`}>
                            {deadline.text}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(order.total)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            href={`/${locale}/dashboard/courier-admin/orders/${order._id}`}
                            className="inline-flex items-center gap-1 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium"
                          >
                            {t('details')}
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
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-zinc-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('showingOrders', {
                    from: (pagination.page - 1) * pagination.limit + 1,
                    to: Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    ),
                    total: pagination.total,
                  })}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {tCommon('previous')}
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {tCommon('next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AllDeliveryOrdersPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.COURIER_ADMIN]}>
      <AllDeliveryOrdersContent />
    </ProtectedRoute>
  );
}
