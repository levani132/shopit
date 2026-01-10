'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../../../../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface OrderItem {
  productId: string;
  name: string;
  nameEn?: string;
  image: string;
  qty: number;
  price: number;
  variantAttributes?: Array<{
    attributeName: string;
    value: string;
  }>;
}

interface Order {
  _id: string;
  orderItems: OrderItem[];
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
  status: string;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt: string;
  shippingDetails: {
    address: string;
    city: string;
    country: string;
    postalCode?: string;
    phoneNumber?: string;
  };
}

// Order status progression
const statusOrder = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

const statusColors: Record<string, string> = {
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  shipped:
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

// Georgian month names
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

function formatDateLocalized(dateString: string, locale: string): string {
  const date = new Date(dateString);

  if (locale === 'ka') {
    const day = date.getDate();
    const month = georgianMonths[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month}, ${year}`;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Status Timeline Component
function StatusTimeline({
  currentStatus,
  t,
}: {
  currentStatus: string;
  t: (key: string) => string;
}) {
  const isCancelled =
    currentStatus === 'cancelled' || currentStatus === 'refunded';
  const currentIndex = statusOrder.indexOf(currentStatus);

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center py-3">
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[currentStatus]}`}
        >
          {t(`status.${currentStatus}`)}
        </span>
      </div>
    );
  }

  return (
    <div className="py-4 px-2 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[400px]">
        {statusOrder.map((status, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === statusOrder.length - 1;

          return (
            <div key={status} className="flex items-center flex-1">
              {/* Status dot and label */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    isCompleted
                      ? isCurrent
                        ? 'bg-[var(--store-accent-500)] text-white ring-4 ring-[var(--store-accent-100)] dark:ring-[var(--store-accent-900)]'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs whitespace-nowrap ${
                    isCompleted
                      ? 'text-gray-900 dark:text-white font-medium'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {t(`status.${status}`)}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    index < currentIndex
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-zinc-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Expandable Order Footer Component
function OrderFooter({
  order,
  t,
  locale,
}: {
  order: Order;
  t: (key: string) => string;
  locale: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
      {/* Collapsed view - clickable header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
          <span>
            {order.shippingDetails.city}, {order.shippingDetails.country}
          </span>
          <span className="text-gray-300 dark:text-zinc-600">•</span>
          <span>{t('viewDetails')}</span>
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('total')}: ₾{order.totalPrice.toFixed(2)}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-zinc-700">
          {/* Shipping Details */}
          <div className="pt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {t('shippingDetails')}
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>{order.shippingDetails.address}</p>
              <p>
                {order.shippingDetails.city}
                {order.shippingDetails.postalCode &&
                  `, ${order.shippingDetails.postalCode}`}
              </p>
              <p>{order.shippingDetails.country}</p>
              {order.shippingDetails.phoneNumber && (
                <p className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {order.shippingDetails.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="pt-4 border-t border-gray-200 dark:border-zinc-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {t('priceBreakdown')}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('subtotal')}</span>
                <span>
                  ₾
                  {(
                    order.itemsPrice ||
                    order.totalPrice - (order.shippingPrice || 0)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('shipping')}</span>
                <span>
                  {order.shippingPrice > 0
                    ? `₾${order.shippingPrice.toFixed(2)}`
                    : t('free')}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-zinc-700">
                <span>{t('total')}</span>
                <span>₾{order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const t = useTranslations('orders');
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';
  const subdomain = params?.subdomain as string;

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (authLoading) return;
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const url = subdomain
          ? `${API_URL}/api/v1/orders/my-orders?storeSubdomain=${encodeURIComponent(subdomain)}`
          : `${API_URL}/api/v1/orders/my-orders`;

        const response = await fetch(url, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        } else {
          setError('Failed to load orders');
        }
      } catch (err) {
        console.error('[Orders] Error fetching orders:', err);
        setError('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, authLoading, subdomain]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48 mx-auto mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-zinc-700 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('loginRequired')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('loginRequiredDescription')}
        </p>
        <Link
          href={`/${locale}/login?returnUrl=/${locale}/orders`}
          className="inline-block px-6 py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
        >
          {t('login')}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-gray-400 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('noOrders')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('noOrdersDescription')}
        </p>
        <Link
          href={`/${locale}/products`}
          className="inline-block px-6 py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
        >
          {t('startShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        {t('title')}
      </h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order._id}
            className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden"
          >
            {/* Order Header */}
            <div className="p-4 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('orderNumber')}
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white">
                    {order._id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('orderDate')}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDateLocalized(order.createdAt, locale)}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || statusColors.pending}`}
                  >
                    {t(`status.${order.status}`)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="border-b border-gray-200 dark:border-zinc-700">
              <StatusTimeline currentStatus={order.status} t={t} />
            </div>

            {/* Order Items */}
            <div className="p-4 space-y-4">
              {order.orderItems.map((item, idx) => (
                <Link
                  key={idx}
                  href={`/${locale}/products/${item.productId}`}
                  className="flex gap-4 p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors group"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700 flex-shrink-0 ring-2 ring-transparent group-hover:ring-[var(--store-accent-300)] transition-all">
                    <Image
                      src={item.image || '/placeholder.webp'}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-[var(--store-accent-600)] dark:group-hover:text-[var(--store-accent-400)] transition-colors">
                      {locale === 'en' && item.nameEn ? item.nameEn : item.name}
                    </p>
                    {item.variantAttributes &&
                      item.variantAttributes.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.variantAttributes
                            .map((a) => `${a.attributeName}: ${a.value}`)
                            .join(', ')}
                        </p>
                      )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        x{item.qty}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        ₾{(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {/* Arrow indicator */}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>

            {/* Expandable Order Footer */}
            <OrderFooter order={order} t={t} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}
