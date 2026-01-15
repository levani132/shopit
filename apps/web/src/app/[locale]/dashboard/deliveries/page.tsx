'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface OrderItem {
  productId: string;
  name: string;
  nameEn?: string;
  image: string;
  qty: number;
  price: number;
  storeName: string;
}

interface Order {
  _id: string;
  orderItems: OrderItem[];
  shippingDetails: {
    address: string;
    city: string;
    country: string;
    postalCode?: string;
    phoneNumber?: string;
  };
  totalPrice: number;
  shippingPrice: number;
  status: string;
  createdAt: string;
  courierId?: string;
  deliveryDeadline?: string;
  courierAssignedAt?: string;
  // Pickup address
  pickupStoreName?: string;
  pickupAddress?: string;
  pickupCity?: string;
  pickupPhoneNumber?: string;
  // Recipient info
  recipientName?: string;
  // Courier earnings (calculated by API based on earnings percentage)
  courierEarning?: number;
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

function formatDateLocalized(
  dateString: string,
  locale: string,
  includeTime = false,
): string {
  const date = new Date(dateString);

  if (locale === 'ka') {
    const day = date.getDate();
    const month = georgianMonths[date.getMonth()];
    if (includeTime) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day} ${month}, ${hours}:${minutes}`;
    }
    return `${day} ${month}`;
  }

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return date.toLocaleDateString('en-US', options);
}

// Calculate remaining time until deadline
function getRemainingTime(deadline: string): { text: string; isOverdue: boolean; urgency: 'normal' | 'warning' | 'danger' } {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { text: 'Overdue', isOverdue: true, urgency: 'danger' };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let urgency: 'normal' | 'warning' | 'danger' = 'normal';
  if (days === 0) {
    urgency = 'danger';
  } else if (days <= 1) {
    urgency = 'warning';
  }

  if (days > 0) {
    return { text: `${days}d ${remainingHours}h`, isOverdue: false, urgency };
  }
  return { text: `${hours}h`, isOverdue: false, urgency };
}

export default function DeliveriesPage() {
  const t = useTranslations('courier');
  const tDash = useTranslations('dashboard');
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';

  const [activeTab, setActiveTab] = useState<'available' | 'my'>('available');
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/orders/courier/available`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableOrders(data);
      }
    } catch (err) {
      console.error('Error fetching available orders:', err);
    }
  }, []);

  const fetchMyOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/orders/courier/my-orders`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMyOrders(data);
      }
    } catch (err) {
      console.error('Error fetching my orders:', err);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'courier') {
      setError('You must be a courier to access this page');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchAvailableOrders(), fetchMyOrders()]);
      setLoading(false);
    };

    fetchData();
  }, [authLoading, user, fetchAvailableOrders, fetchMyOrders]);

  const handleAssignOrder = async (orderId: string) => {
    setProcessingOrder(orderId);
    try {
      const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/assign-courier`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (response.ok) {
        await Promise.all([fetchAvailableOrders(), fetchMyOrders()]);
        setActiveTab('my');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to assign order');
      }
    } catch (err) {
      console.error('Error assigning order:', err);
      setError('Failed to assign order');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: 'shipped' | 'delivered') => {
    setProcessingOrder(orderId);
    try {
      const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/courier-status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        await fetchMyOrders();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status');
    } finally {
      setProcessingOrder(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 dark:bg-zinc-700 rounded-xl" />
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

  const displayOrders = activeTab === 'available' ? availableOrders : myOrders;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('deliveryOrders')}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {tDash('overviewDescription')}
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'available'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
          }`}
        >
          {t('availableOrders')} ({availableOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'my'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
          }`}
        >
          {t('myDeliveries')} ({myOrders.length})
        </button>
      </div>

      {/* Orders List */}
      {displayOrders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('noAvailableOrders')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('noAvailableOrdersDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayOrders.map((order) => (
            <div
              key={order._id}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden"
            >
              {/* Order Header */}
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-700">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Order #{order._id.slice(-8).toUpperCase()}
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ₾{order.totalPrice.toFixed(2)}
                    </p>
                  </div>

                  {/* Delivery Deadline */}
                  {order.deliveryDeadline && (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('deliveryDeadline')}
                      </p>
                      {(() => {
                        const remaining = getRemainingTime(order.deliveryDeadline);
                        return (
                          <p className={`font-semibold ${
                            remaining.urgency === 'danger' 
                              ? 'text-red-600 dark:text-red-400' 
                              : remaining.urgency === 'warning'
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {remaining.isOverdue ? '⚠️ ' : '⏰ '}{remaining.text}
                          </p>
                        );
                      })()}
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDateLocalized(order.deliveryDeadline, locale, true)}
                      </p>
                    </div>
                  )}

                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('yourEarning')}
                    </p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      ₾{(order.courierEarning ?? order.shippingPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {order.orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-700 rounded-lg px-3 py-2">
                      <div className="relative w-10 h-10 rounded overflow-hidden">
                        <Image
                          src={item.image || '/placeholder.png'}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.storeName} × {item.qty}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Addresses: Pickup and Delivery */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pickup Address (Store) */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <svg
                        className="w-5 h-5 text-blue-500"
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
                      <p className="font-medium text-blue-700 dark:text-blue-300">
                        {t('pickupAddress')}
                      </p>
                    </div>
                    {order.pickupStoreName && (
                      <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                        {order.pickupStoreName}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {order.pickupAddress || order.orderItems[0]?.storeName}
                      {order.pickupCity && `, ${order.pickupCity}`}
                    </p>
                    
                    {/* Action Buttons for Pickup */}
                    <div className="flex gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${order.pickupAddress || ''} ${order.pickupCity || ''}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        {t('openInMaps')}
                      </a>
                      {order.pickupPhoneNumber && (
                        <a
                          href={`tel:${order.pickupPhoneNumber}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {t('callShop')}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address (Customer) */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
                      <p className="font-medium text-green-700 dark:text-green-300">
                        {t('deliveryAddress')}
                      </p>
                    </div>
                    {order.recipientName && (
                      <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                        {order.recipientName}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {order.shippingDetails.address}, {order.shippingDetails.city}
                      {order.shippingDetails.postalCode && `, ${order.shippingDetails.postalCode}`}
                    </p>
                    
                    {/* Action Buttons for Delivery */}
                    <div className="flex gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${order.shippingDetails.address} ${order.shippingDetails.city}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        {t('openInMaps')}
                      </a>
                      {order.shippingDetails.phoneNumber && (
                        <a
                          href={`tel:${order.shippingDetails.phoneNumber}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {t('callCustomer')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {activeTab === 'available' ? (
                    <button
                      onClick={() => handleAssignOrder(order._id)}
                      disabled={!!processingOrder}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {processingOrder === order._id ? '...' : t('assignToMe')}
                    </button>
                  ) : (
                    <>
                      {order.status === 'ready_for_delivery' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'shipped')}
                          disabled={!!processingOrder}
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {processingOrder === order._id ? '...' : t('markAsShipped')}
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button
                          onClick={() => handleUpdateStatus(order._id, 'delivered')}
                          disabled={!!processingOrder}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          {processingOrder === order._id ? '...' : t('markAsDelivered')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

