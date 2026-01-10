'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useAuth } from '../../../../contexts/AuthContext';
import { getLocalizedText } from '../../../../lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface OrderItem {
  productId: string;
  productName: string;
  productNameLocalized?: { ka?: string; en?: string };
  productImage: string;
  quantity: number;
  price: number;
  salePrice?: number;
  variantAttributes?: Array<{
    attributeName: string;
    value: string;
  }>;
}

interface ShippingDetails {
  address: string;
  city: string;
  country: string;
  phoneNumber: string;
}

interface Order {
  _id: string;
  orderItems: OrderItem[];
  totalPrice: number;
  itemsPrice: number;
  shippingPrice: number;
  status: string;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt: string;
  shippingDetails: ShippingDetails;
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  guestInfo?: {
    email: string;
    fullName: string;
    phoneNumber: string;
  };
  isGuestOrder: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  shipped: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusOrder = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

export default function DashboardOrdersPage() {
  const t = useTranslations('dashboard');
  const tOrders = useTranslations('orders');
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (authLoading) return;
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/v1/orders/seller`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, authLoading]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setOrders(
          orders.map((order) =>
            order._id === orderId
              ? {
                  ...order,
                  status: newStatus,
                  isDelivered: newStatus === 'delivered',
                  deliveredAt:
                    newStatus === 'delivered' ? new Date().toISOString() : order.deliveredAt,
                }
              : order,
          ),
        );
        if (selectedOrder?._id === orderId) {
          setSelectedOrder({
            ...selectedOrder,
            status: newStatus,
            isDelivered: newStatus === 'delivered',
            deliveredAt:
              newStatus === 'delivered' ? new Date().toISOString() : selectedOrder.deliveredAt,
          });
        }
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    } finally {
      setUpdating(null);
    }
  };

  const filteredOrders =
    statusFilter === 'all'
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-zinc-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {t('orders')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your incoming orders and update their status.
        </p>
      </div>

      {/* Status filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-[var(--accent-500)] text-white'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
          }`}
        >
          All ({orders.length})
        </button>
        {statusOrder.map((status) => {
          const count = orders.filter((o) => o.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[var(--accent-500)] text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              {tOrders(`status.${status}`)} ({count})
            </button>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[var(--accent-600)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Orders Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              When customers place orders, they&apos;ll appear here. Share your store to
              start receiving orders!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders list */}
          <div className="lg:col-span-2 space-y-4">
            {filteredOrders.map((order) => (
              <button
                key={order._id}
                onClick={() => setSelectedOrder(order)}
                className={`w-full text-left p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border-2 transition-colors ${
                  selectedOrder?._id === order._id
                    ? 'border-[var(--accent-500)]'
                    : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-mono text-sm text-gray-500 dark:text-gray-400">
                      #{order._id.slice(-8)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || statusColors.pending}`}
                  >
                    {tOrders(`status.${order.status}`)}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  {order.orderItems.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700"
                    >
                      <Image
                        src={item.productImage || '/placeholder.webp'}
                        alt={item.productName}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {order.orderItems.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                      +{order.orderItems.length - 3}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {order.orderItems.reduce((sum, item) => sum + item.quantity, 0)} items
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ₾{order.totalPrice.toFixed(2)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Order details */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Order Details
                </h3>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">
                      {selectedOrder._id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedOrder.isGuestOrder
                        ? selectedOrder.guestInfo?.fullName
                        : `${selectedOrder.user?.firstName || ''} ${selectedOrder.user?.lastName || ''}`}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedOrder.isGuestOrder
                        ? selectedOrder.guestInfo?.email
                        : selectedOrder.user?.email}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Shipping Address
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedOrder.shippingDetails.address}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedOrder.shippingDetails.city},{' '}
                      {selectedOrder.shippingDetails.country}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedOrder.shippingDetails.phoneNumber}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 mb-6">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Items</p>
                  <div className="space-y-3">
                    {selectedOrder.orderItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700 flex-shrink-0">
                          <Image
                            src={item.productImage || '/placeholder.webp'}
                            alt={item.productName}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {getLocalizedText(
                              item.productNameLocalized,
                              item.productName,
                              locale,
                            )}
                          </p>
                          {item.variantAttributes &&
                            item.variantAttributes.length > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.variantAttributes
                                  .map((a) => `${a.attributeName}: ${a.value}`)
                                  .join(', ')}
                              </p>
                            )}
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              x{item.quantity}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              ₾{((item.salePrice || item.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">
                      ₾{selectedOrder.itemsPrice?.toFixed(2) || selectedOrder.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                    <span className="text-gray-900 dark:text-white">
                      ₾{selectedOrder.shippingPrice?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200 dark:border-zinc-700">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">
                      ₾{selectedOrder.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Status update */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Update Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {statusOrder.map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder._id, status)}
                        disabled={
                          updating === selectedOrder._id ||
                          selectedOrder.status === status
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          selectedOrder.status === status
                            ? statusColors[status]
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {tOrders(`status.${status}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Select an order to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
