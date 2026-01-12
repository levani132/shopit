'use client';

import { useState, useEffect, useCallback } from 'react';
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
}

export default function DeliveriesPage() {
  const t = useTranslations('courier');
  const tDash = useTranslations('dashboard');
  const { user, isLoading: authLoading } = useAuth();

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
              <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-700 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Order #{order._id.slice(-8).toUpperCase()}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ₾{order.totalPrice.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('deliveryFee')}
                  </p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    ₾{order.shippingPrice.toFixed(2)}
                  </p>
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

                {/* Delivery Address */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-lg">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5"
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
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('deliveryAddress')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {order.shippingDetails.address}, {order.shippingDetails.city}
                      {order.shippingDetails.postalCode && `, ${order.shippingDetails.postalCode}`}
                    </p>
                    {order.shippingDetails.phoneNumber && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        📞 {order.shippingDetails.phoneNumber}
                      </p>
                    )}
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

