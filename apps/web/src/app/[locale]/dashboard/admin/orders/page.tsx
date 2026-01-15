'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ProtectedRoute } from '../../../../../components/auth/ProtectedRoute';
import { Role } from '@sellit/constants';
import { api } from '../../../../../lib/api';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  storeName: string;
}

interface Order {
  _id: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  orderItems: OrderItem[];
  status: string;
  totalPrice: number;
  itemsPrice: number;
  shippingPrice: number;
  createdAt: string;
  paidAt?: string;
  deliveredAt?: string;
  shippingDetails?: {
    firstName: string;
    lastName: string;
    city: string;
    address: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function OrdersManagementContent() {
  const t = useTranslations('admin');
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/admin/orders?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    try {
      const response = await api.patch(`/admin/orders/${orderId}/status`, {
        status: newStatus,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order status');
      }
      // Update the local state
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order,
        ),
      );
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      setError(err.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'shipped':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'processing':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'paid':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('ordersManagementTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('ordersManagementDescription')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
        >
          <option value="">{t('allStatuses')}</option>
          <option value="pending">{t('orderPending')}</option>
          <option value="paid">{t('orderPaid')}</option>
          <option value="processing">{t('orderProcessing')}</option>
          <option value="shipped">{t('orderShipped')}</option>
          <option value="delivered">{t('orderDelivered')}</option>
          <option value="cancelled">{t('orderCancelled')}</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-500)] border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {t('noOrdersFound')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-zinc-700">
            {orders.map((order) => (
              <div key={order._id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t('orderId')}: #{order._id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {order.user
                          ? `${order.user.firstName} ${order.user.lastName} (${order.user.email})`
                          : t('guestOrder')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(order.status || 'pending')}`}
                    >
                      {t(
                        `order${(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}`,
                      )}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₾{order.totalPrice.toFixed(2)}
                    </span>
                    <button
                      onClick={() =>
                        setExpandedOrderId(
                          expandedOrderId === order._id ? null : order._id,
                        )
                      }
                      className="text-sm text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:underline"
                    >
                      {expandedOrderId === order._id
                        ? t('hideDetails')
                        : t('showDetails')}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOrderId === order._id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Order Items */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('orderItems')}
                        </h4>
                        <div className="space-y-2">
                          {order.orderItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm bg-gray-50 dark:bg-zinc-700/50 p-2 rounded"
                            >
                              <span className="text-gray-700 dark:text-gray-300">
                                {item.name} x{item.qty}
                              </span>
                              <span className="text-gray-900 dark:text-white">
                                ₾{(item.price * item.qty).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-zinc-600 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('subtotal')}
                            </span>
                            <span>₾{order.itemsPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('shipping')}
                            </span>
                            <span>₾{order.shippingPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>{t('total')}</span>
                            <span>₾{order.totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Shipping & Timeline */}
                      <div>
                        {order.shippingDetails && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t('shippingAddress')}
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-zinc-700/50 p-2 rounded">
                              <p>
                                {order.shippingDetails.firstName}{' '}
                                {order.shippingDetails.lastName}
                              </p>
                              <p>{order.shippingDetails.address}</p>
                              <p>{order.shippingDetails.city}</p>
                            </div>
                          </div>
                        )}
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('timeline')}
                        </h4>
                        <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                          <p>
                            {t('createdAt')}:{' '}
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                          {order.paidAt && (
                            <p>
                              {t('paidAt')}:{' '}
                              {new Date(order.paidAt).toLocaleString()}
                            </p>
                          )}
                          {order.deliveredAt && (
                            <p>
                              {t('deliveredAt')}:{' '}
                              {new Date(order.deliveredAt).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {/* Change Status */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-600">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('changeStatus')}
                          </h4>
                          <div className="flex gap-2">
                            <select
                              value={order.status || 'pending'}
                              onChange={(e) =>
                                updateOrderStatus(order._id, e.target.value)
                              }
                              disabled={updatingStatus === order._id}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent disabled:opacity-50"
                            >
                              <option value="pending">
                                {t('orderPending')}
                              </option>
                              <option value="paid">{t('orderPaid')}</option>
                              <option value="processing">
                                {t('orderProcessing')}
                              </option>
                              <option value="ready_for_delivery">
                                {t('orderReadyForDelivery')}
                              </option>
                              <option value="shipped">
                                {t('orderShipped')}
                              </option>
                              <option value="delivered">
                                {t('orderDelivered')}
                              </option>
                              <option value="cancelled">
                                {t('orderCancelled')}
                              </option>
                              <option value="refunded">
                                {t('orderRefunded')}
                              </option>
                            </select>
                            {updatingStatus === order._id && (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[var(--accent-500)] border-t-transparent" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
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
              onClick={() => fetchOrders(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {t('previous')}
            </button>
            <button
              onClick={() => fetchOrders(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersManagementPage() {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN]}>
      <OrdersManagementContent />
    </ProtectedRoute>
  );
}
