'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ProtectedRoute } from '../../../../../../components/auth/ProtectedRoute';
import { Role } from '@shopit/constants';
import { api } from '../../../../../../lib/api';

interface OrderDetails {
  _id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalPrice: number;
  deliveryDeadline?: string;
  deliveredAt?: string;
  courierAssignedAt?: string;
  pickedUpAt?: string;
  isOverdue?: boolean;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
  guestInfo?: {
    fullName: string;
    email: string;
    phoneNumber?: string;
  };
  courierId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
  };
  shippingDetails?: {
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    variant?: string;
  }>;
  deliveryNotes?: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

function OrderDetailsContent() {
  const params = useParams();
  const t = useTranslations('courierAdmin');
  const orderId = params.id as string;
  const locale = params.locale as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<OrderDetails>(
        `/courier-admin/orders/${orderId}`,
      );
      setOrder(data);
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load order details',
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, fetchOrderDetails]);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString(locale === 'ka' ? 'ka-GE' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ka' ? 'ka-GE' : 'en-US', {
      style: 'currency',
      currency: 'GEL',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; className: string; icon: string }
    > = {
      paid: {
        label: t('awaitingPickup'),
        className:
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: '⏳',
      },
      processing: {
        label: t('processing'),
        className:
          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        icon: '⚙️',
      },
      ready_for_delivery: {
        label: t('readyForDelivery'),
        className:
          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: '📦',
      },
      assigned_to_courier: {
        label: t('courierAssigned'),
        className:
          'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        icon: '🚴',
      },
      picked_up: {
        label: t('inTransit'),
        className:
          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        icon: '🚚',
      },
      delivered: {
        label: t('delivered'),
        className:
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        icon: '✅',
      },
      cancelled: {
        label: t('cancelled'),
        className:
          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
        icon: '❌',
      },
    };

    return (
      statusMap[status] || {
        label: status,
        className:
          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
        icon: '❓',
      }
    );
  };

  const getDeliveryTimeInfo = () => {
    if (!order) return null;

    const now = new Date();
    const deadline = order.deliveryDeadline
      ? new Date(order.deliveryDeadline)
      : null;
    const delivered = order.deliveredAt ? new Date(order.deliveredAt) : null;
    const assigned = order.courierAssignedAt
      ? new Date(order.courierAssignedAt)
      : null;

    if (delivered && deadline) {
      const wasOnTime = delivered <= deadline;
      const diffMs = Math.abs(delivered.getTime() - deadline.getTime());
      const diffMins = Math.floor(diffMs / 60000);

      return {
        isComplete: true,
        wasOnTime,
        deliveryTime: assigned
          ? Math.floor((delivered.getTime() - assigned.getTime()) / 60000)
          : null,
        diffFromDeadline: diffMins,
      };
    }

    if (deadline && !delivered) {
      const diffMs = deadline.getTime() - now.getTime();
      const isOverdue = diffMs < 0;
      const diffMins = Math.abs(Math.floor(diffMs / 60000));

      return {
        isComplete: false,
        isOverdue,
        remainingMins: isOverdue ? 0 : diffMins,
        overdueMins: isOverdue ? diffMins : 0,
      };
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-red-400"
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
        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          {error || t('orderNotFound')}
        </h3>
        <Link
          href={`/${locale}/dashboard/courier-admin/orders`}
          className="mt-4 inline-flex items-center text-cyan-600 hover:text-cyan-700"
        >
          <svg
            className="h-4 w-4 mr-1"
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
          {t('backToOrders')}
        </Link>
      </div>
    );
  }

  const statusBadge = getStatusBadge(order.status);
  const deliveryInfo = getDeliveryTimeInfo();
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
            <Link
              href={`/${locale}/dashboard/courier-admin/orders`}
              className="hover:text-cyan-600 dark:hover:text-cyan-400"
            >
              {t('allDeliveryOrders')}
            </Link>
            <span>/</span>
            <span>#{order.orderNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('orderDetails')} #{order.orderNumber}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${statusBadge.className}`}
            >
              <span>{statusBadge.icon}</span>
              {statusBadge.label}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchOrderDetails}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
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
      </div>

      {/* Delivery Time Alert */}
      {deliveryInfo && !deliveryInfo.isComplete && (
        <div
          className={`p-4 rounded-lg border ${
            deliveryInfo.isOverdue
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : deliveryInfo.remainingMins && deliveryInfo.remainingMins < 60
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <svg
              className={`w-6 h-6 ${
                deliveryInfo.isOverdue
                  ? 'text-red-500'
                  : deliveryInfo.remainingMins &&
                      deliveryInfo.remainingMins < 60
                    ? 'text-orange-500'
                    : 'text-yellow-500'
              }`}
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
            <div>
              {deliveryInfo.isOverdue ? (
                <p className="font-semibold text-red-700 dark:text-red-400">
                  {t('overdueBy', { minutes: deliveryInfo.overdueMins })}
                </p>
              ) : (
                <p
                  className={`font-semibold ${
                    deliveryInfo.remainingMins &&
                    deliveryInfo.remainingMins < 60
                      ? 'text-orange-700 dark:text-orange-400'
                      : 'text-yellow-700 dark:text-yellow-400'
                  }`}
                >
                  {t('deadlineIn', {
                    minutes: deliveryInfo.remainingMins ?? 0,
                  })}
                </p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('deliveryDeadline')}:{' '}
                {formatDateTime(order.deliveryDeadline)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completed Delivery Info */}
      {deliveryInfo?.isComplete && (
        <div
          className={`p-4 rounded-lg border ${
            deliveryInfo.wasOnTime
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <svg
              className={`w-6 h-6 ${deliveryInfo.wasOnTime ? 'text-green-500' : 'text-red-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {deliveryInfo.wasOnTime ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            <div>
              <p
                className={`font-semibold ${deliveryInfo.wasOnTime ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}
              >
                {deliveryInfo.wasOnTime
                  ? t('deliveredOnTime')
                  : t('deliveredLate')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('deliveredAt')}: {formatDateTime(order.deliveredAt)}
                {deliveryInfo.deliveryTime &&
                  ` (${t('deliveryTime')}: ${deliveryInfo.deliveryTime} min)`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('orderItems')}
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-zinc-700">
              {order.items?.map((item, index) => (
                <div
                  key={index}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    {item.variant && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.variant}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('quantity')}: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-700/50 flex justify-between">
              <span className="font-semibold text-gray-900 dark:text-white">
                {t('total')}
              </span>
              <span className="font-bold text-lg text-gray-900 dark:text-white">
                {formatCurrency(order.totalPrice)}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('orderTimeline')}
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="flex-1 w-0.5 bg-gray-200 dark:bg-zinc-600"></div>
                </div>
                <div className="pb-4">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t('orderCreated')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
              </div>

              {order.courierAssignedAt && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="flex-1 w-0.5 bg-gray-200 dark:bg-zinc-600"></div>
                  </div>
                  <div className="pb-4">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t('courierAssigned')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(order.courierAssignedAt)}
                    </p>
                  </div>
                </div>
              )}

              {order.pickedUpAt && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <div className="flex-1 w-0.5 bg-gray-200 dark:bg-zinc-600"></div>
                  </div>
                  <div className="pb-4">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t('orderPickedUp')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(order.pickedUpAt)}
                    </p>
                  </div>
                </div>
              )}

              {order.deliveredAt && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t('delivered')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(order.deliveredAt)}
                    </p>
                  </div>
                </div>
              )}

              {!order.deliveredAt && order.status !== 'cancelled' && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-gray-300 dark:bg-zinc-500 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500 dark:text-gray-400">
                      {t('awaitingDelivery')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Notes */}
          {order.deliveryNotes && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('deliveryNotes')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {order.deliveryNotes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('customerInfo')}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="text-gray-900 dark:text-white">
                  {order.user
                    ? `${order.user.firstName} ${order.user.lastName}`
                    : order.guestInfo?.fullName || 'Guest'}
                </span>
              </div>
              {(order.user?.email || order.guestInfo?.email) && (
                <div className="flex items-center gap-3">
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
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {order.user?.email || order.guestInfo?.email}
                  </span>
                </div>
              )}
              {(order.user?.phoneNumber || order.guestInfo?.phoneNumber) && (
                <div className="flex items-center gap-3">
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
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <a
                    href={`tel:${order.user?.phoneNumber || order.guestInfo?.phoneNumber}`}
                    className="text-cyan-600 dark:text-cyan-400 text-sm hover:underline"
                  >
                    {order.user?.phoneNumber || order.guestInfo?.phoneNumber}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address */}
          {order.shippingDetails && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('deliveryAddress')}
              </h2>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                  {order.shippingDetails.address && (
                    <p>{order.shippingDetails.address}</p>
                  )}
                  <p>
                    {[
                      order.shippingDetails.city,
                      order.shippingDetails.state,
                      order.shippingDetails.postalCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {order.shippingDetails.country && (
                    <p>{order.shippingDetails.country}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Courier Info */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('courierInfo')}
            </h2>
            {order.courierId ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                      {order.courierId.firstName?.charAt(0) || 'C'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {order.courierId.firstName} {order.courierId.lastName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.courierId.email}
                    </p>
                  </div>
                </div>
                {order.courierId.phoneNumber && (
                  <a
                    href={`tel:${order.courierId.phoneNumber}`}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors text-sm"
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
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {t('callCourier')}
                  </a>
                )}
                <Link
                  href={`/${locale}/dashboard/courier-admin/couriers/${order.courierId._id}`}
                  className="inline-flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  {t('viewCourierProfile')}
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
              </div>
            ) : (
              <div className="text-center py-4">
                <svg
                  className="w-12 h-12 text-yellow-400 mx-auto mb-2"
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
                <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                  {t('noCourierAssigned')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('awaitingCourierAssignment')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.COURIER_ADMIN]}>
      <OrderDetailsContent />
    </ProtectedRoute>
  );
}
