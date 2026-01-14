'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Order status progression
const statusOrder = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

const statusColors: Record<string, string> = {
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ready_for_delivery:
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

// Status icons for timeline
const statusIcons: Record<string, React.ReactNode> = {
  pending: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  paid: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  processing: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  shipped: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
  delivered: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

export interface OrderItem {
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
  selectedAttributes?: Record<string, string>;
}

export interface Courier {
  _id: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface Order {
  _id: string;
  orderItems: OrderItem[];
  itemsPrice?: number;
  shippingPrice?: number;
  totalPrice: number;
  status: string;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt: string;
  shippingDetails?: {
    address: string;
    city: string;
    country: string;
    postalCode?: string;
    phoneNumber?: string;
  };
  courierId?: Courier;
  courierAssignedAt?: string;
  store?: {
    _id: string;
    name: string;
    subdomain: string;
  };
}

interface TranslationFn {
  (key: string): string;
}

// Compact Inline Status Timeline Component
function CompactTimeline({
  currentStatus,
  t,
}: {
  currentStatus: string;
  t: TranslationFn;
}) {
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'refunded';

  // Map ready_for_delivery to processing for buyers (they shouldn't see internal status)
  const displayStatus = currentStatus === 'ready_for_delivery' ? 'processing' : currentStatus;
  const currentIndex = statusOrder.indexOf(displayStatus);

  if (isCancelled) {
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[currentStatus]}`}>
        {currentStatus === 'cancelled' ? '✕' : '↩'} {t(`status.${currentStatus}`)}
      </span>
    );
  }

  return (
    <div className="flex items-center">
      {statusOrder.map((status, index) => {
        const isCompleted = index <= currentIndex;
        const isLast = index === statusOrder.length - 1;

        return (
          <div key={status} className="flex items-center">
            <div className="relative group/step">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-gray-500'
                }`}
              >
                {statusIcons[status]}
              </div>
              <div
                className={
                  (isLast ? 'left-[calc(50%-25px)]' : 'left-1/2') +
                  ' absolute top-full -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 dark:bg-zinc-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none z-10'
                }
              >
                {t(`status.${status}`)}
                <div
                  className={
                    (isLast ? 'left-[calc(50%+25px)]' : 'left-1/2') +
                    ' absolute bottom-full -translate-x-1/2 border-4 border-transparent border-b-gray-900 dark:border-b-zinc-700'
                  }
                />
              </div>
            </div>
            {!isLast && (
              <div
                className={`w-4 h-0.5 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-zinc-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Expandable Order Footer Component
function OrderFooter({
  order,
  t,
}: {
  order: Order;
  t: TranslationFn;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const shippingDetails = order.shippingDetails;

  return (
    <div className="border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {shippingDetails ? (
            <>
              <span>{shippingDetails.city}, {shippingDetails.country}</span>
              <span className="text-gray-300 dark:text-zinc-600">•</span>
            </>
          ) : null}
          <span>{t('viewDetails')}</span>
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('total')}: ₾{order.totalPrice.toFixed(2)}
        </div>
      </button>

      {isExpanded && shippingDetails && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {/* Shipping Details */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                {t('shippingDetails')}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>{shippingDetails.address}</p>
                <p>
                  {shippingDetails.city}
                  {shippingDetails.postalCode && `, ${shippingDetails.postalCode}`}
                </p>
                <p>{shippingDetails.country}</p>
                {shippingDetails.phoneNumber && (
                  <p className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {shippingDetails.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Courier Info */}
            {order.courierId && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {t('courier')}
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    {order.courierId.firstName} {order.courierId.lastName}
                  </p>
                  {order.courierId.phoneNumber && (
                    <p className="flex items-center gap-2 pl-8">
                      📞 {order.courierId.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                {t('priceBreakdown')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('subtotal')}</span>
                  <span>
                    ₾{(order.itemsPrice || order.totalPrice - (order.shippingPrice || 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t('shipping')}</span>
                  <span>
                    {(order.shippingPrice || 0) > 0 ? `₾${(order.shippingPrice || 0).toFixed(2)}` : t('free')}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-zinc-700">
                  <span>{t('total')}</span>
                  <span>₾{order.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  locale: string;
  t: TranslationFn;
  onPayNow?: (orderId: string) => void;
  processingPayment?: string | null;
  /** Base URL for product links (e.g., "/ka" or "/store/myshop/ka") */
  productLinkBase?: string;
  /** Whether to show the store name (for dashboard view) */
  showStoreName?: boolean;
}

export function OrderCard({
  order,
  locale,
  t,
  onPayNow,
  processingPayment,
  productLinkBase,
  showStoreName = false,
}: OrderCardProps) {
  // Determine the product link base
  const getProductLink = (productId: string) => {
    if (productLinkBase) {
      return `${productLinkBase}/products/${productId}`;
    }
    if (order.store?.subdomain) {
      return `https://${order.store.subdomain}.shopit.ge/${locale}/products/${productId}`;
    }
    return `/${locale}/products/${productId}`;
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
      {/* Order Header with Compact Timeline */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('orderNumber')}
              </p>
              <p className="font-mono text-sm text-gray-900 dark:text-white">
                {order._id.slice(-8).toUpperCase()}
              </p>
            </div>
            {showStoreName && order.store && (
              <a
                href={`https://${order.store.subdomain}.shopit.ge`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--accent-500)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {order.store.name}
              </a>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('orderDate')}
            </p>
            <p className="text-sm text-gray-900 dark:text-white">
              {formatDateLocalized(order.createdAt, locale)}
            </p>
          </div>

          {/* Pay Now button for pending orders */}
          {order.status === 'pending' && !order.isPaid && onPayNow && (
            <button
              onClick={() => onPayNow(order._id)}
              disabled={processingPayment === order._id}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--store-accent-500,var(--accent-500))] text-white rounded-lg hover:bg-[var(--store-accent-600,var(--accent-600))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {processingPayment === order._id ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('processing')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {t('payNow')}
                </>
              )}
            </button>
          )}

          {/* Compact Timeline with icons */}
          <CompactTimeline currentStatus={order.status} t={t} />
        </div>
      </div>

      {/* Order Items */}
      <div className="p-4 space-y-4">
        {order.orderItems.map((item, idx) => {
          const variantAttributes = item.variantAttributes || 
            (item.selectedAttributes 
              ? Object.entries(item.selectedAttributes).map(([key, value]) => ({ attributeName: key, value }))
              : []);
          
          return (
            <Link
              key={idx}
              href={getProductLink(item.productId)}
              className="flex gap-4 p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors group"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700 flex-shrink-0 ring-2 ring-transparent group-hover:ring-[var(--store-accent-300,var(--accent-300))] transition-all">
                <Image
                  src={item.image || '/placeholder.webp'}
                  alt={item.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-[var(--store-accent-600,var(--accent-600))] dark:group-hover:text-[var(--store-accent-400,var(--accent-400))] transition-colors">
                  {locale === 'en' && item.nameEn ? item.nameEn : item.name}
                </p>
                {variantAttributes.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {variantAttributes.map((a) => `${a.attributeName}: ${a.value}`).join(', ')}
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
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Expandable Order Footer */}
      <OrderFooter order={order} t={t} />
    </div>
  );
}

export { statusColors, formatDateLocalized };

