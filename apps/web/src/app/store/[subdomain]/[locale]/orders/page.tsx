'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../../../../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

// Payment awaiting modal component
function PaymentAwaitingModal({
  isOpen,
  orderId,
  paymentWindow,
  onClose,
  onPaymentComplete,
  t,
}: {
  isOpen: boolean;
  orderId: string | null;
  paymentWindow: Window | null;
  onClose: () => void;
  onPaymentComplete: (orderId: string, status: string) => void;
  t: (key: string) => string;
}) {
  const [status, setStatus] = useState<
    'waiting' | 'success' | 'failed' | 'closed'
  >('waiting');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const windowCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for payment status and check window close
  useEffect(() => {
    if (!isOpen || !orderId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/v1/payments/order-status/${orderId}`,
          {
            credentials: 'include',
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.isPaid) {
            setStatus('success');
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            if (windowCheckRef.current) {
              clearInterval(windowCheckRef.current);
            }
            // Notify parent after a short delay
            setTimeout(() => {
              onPaymentComplete(orderId, 'paid');
            }, 2000);
          } else if (data.status === 'cancelled') {
            setStatus('failed');
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            if (windowCheckRef.current) {
              clearInterval(windowCheckRef.current);
            }
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    };

    // Check if payment window was closed
    const checkWindowClosed = () => {
      if (paymentWindow && paymentWindow.closed && status === 'waiting') {
        setStatus('closed');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
        if (windowCheckRef.current) {
          clearInterval(windowCheckRef.current);
        }
      }
    };

    // Start polling every 2 seconds
    pollStatus(); // Initial check
    pollIntervalRef.current = setInterval(pollStatus, 2000);

    // Check window status every 500ms
    if (paymentWindow) {
      windowCheckRef.current = setInterval(checkWindowClosed, 500);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (windowCheckRef.current) {
        clearInterval(windowCheckRef.current);
      }
    };
  }, [isOpen, orderId, paymentWindow, onPaymentComplete, status]);

  // Reset status when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('waiting');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center">
        {status === 'waiting' && (
          <>
            {/* Animated payment icon */}
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-[var(--store-accent-200)] dark:border-[var(--store-accent-800)] rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-[var(--store-accent-500)] rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[var(--store-accent-500)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('awaitingPayment')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('awaitingPaymentDescription')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {t('paymentWindowOpen')}
            </p>
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
            >
              {t('cancelPayment')}
            </button>
          </>
        )}

        {status === 'closed' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('paymentWindowClosed')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('paymentWindowClosedDescription')}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
            >
              {t('close')}
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-green-500"
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
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('paymentSuccessful')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('paymentSuccessfulDescription')}
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('paymentFailed')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('paymentFailedDescription')}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
            >
              {t('close')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

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

// Status icons for timeline
const statusIcons: Record<string, React.ReactNode> = {
  pending: (
    <svg
      className="w-3 h-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  paid: (
    <svg
      className="w-3 h-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
  processing: (
    <svg
      className="w-3 h-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  shipped: (
    <svg
      className="w-3 h-3"
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
  ),
  delivered: (
    <svg
      className="w-3 h-3"
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
  ),
};

// Compact Inline Status Timeline Component
function CompactTimeline({
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
      <span
        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[currentStatus]}`}
      >
        {currentStatus === 'cancelled' ? '✕' : '↩'}{' '}
        {t(`status.${currentStatus}`)}
      </span>
    );
  }

  return (
    <div className="flex items-center">
      {statusOrder.map((status, index) => {
        const isCompleted = index <= currentIndex;
        const isLast = index === statusOrder.length - 1;

        return (
          <div key={status} className="flex items-center group/step relative">
            {/* Status dot with icon */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              {statusIcons[status]}
            </div>

            {/* Tooltip on hover - positioned below */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 dark:bg-zinc-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none z-10">
              {t(`status.${status}`)}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900 dark:border-b-zinc-700" />
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={`w-4 h-0.5 ${
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
  );
}

// Expandable Order Footer Component
function OrderFooter({
  order,
  t,
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

      {/* Expanded content - side by side */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-zinc-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Shipping Details */}
            <div>
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
            <div>
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

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(
    null,
  );
  const [paymentWindowRef, setPaymentWindowRef] = useState<Window | null>(null);

  const fetchOrders = useCallback(async () => {
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
  }, [authLoading, isAuthenticated, subdomain]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle Pay Now button click
  const handlePayNow = async (orderId: string) => {
    setProcessingPayment(orderId);
    setError(null);

    try {
      // Get payment URL from API
      const response = await fetch(
        `${API_URL}/api/v1/payments/retry/${orderId}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            successUrl: `${window.location.origin}/${locale}/orders?payment=success&orderId=${orderId}`,
            failUrl: `${window.location.origin}/${locale}/orders?payment=failed&orderId=${orderId}`,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to initiate payment');
      }

      const data = await response.json();

      if (data.redirectUrl) {
        // Open payment in new tab/popup
        const paymentWindow = window.open(
          data.redirectUrl,
          '_blank',
          'width=600,height=700',
        );

        // If popup was blocked, redirect in same window
        if (!paymentWindow) {
          window.location.href = data.redirectUrl;
          return;
        }

        // Store window reference for close detection
        setPaymentWindowRef(paymentWindow);

        // Show payment awaiting modal
        setPayingOrderId(orderId);
        setPaymentModalOpen(true);
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to process payment',
      );
    } finally {
      setProcessingPayment(null);
    }
  };

  // Handle payment completion from modal
  const handlePaymentComplete = useCallback(
    (orderId: string, status: string) => {
      setPaymentModalOpen(false);
      setPayingOrderId(null);
      setPaymentWindowRef(null);

      // Refresh orders to get updated status
      fetchOrders();
    },
    [fetchOrders],
  );

  // Handle modal close (user cancelled or window closed)
  const handleModalClose = useCallback(() => {
    // Close the payment window if still open
    if (paymentWindowRef && !paymentWindowRef.closed) {
      paymentWindowRef.close();
    }
    setPaymentModalOpen(false);
    setPayingOrderId(null);
    setPaymentWindowRef(null);
    // Refresh orders to check if payment was completed
    fetchOrders();
  }, [paymentWindowRef, fetchOrders]);

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
            {/* Order Header with Compact Timeline */}
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

                {/* Pay Now button for pending orders */}
                {order.status === 'pending' && !order.isPaid && (
                  <button
                    onClick={() => handlePayNow(order._id)}
                    disabled={processingPayment === order._id}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                  >
                    {processingPayment === order._id ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {t('processing')}
                      </>
                    ) : (
                      <>
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
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
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

      {/* Payment Awaiting Modal */}
      <PaymentAwaitingModal
        isOpen={paymentModalOpen}
        orderId={payingOrderId}
        paymentWindow={paymentWindowRef}
        onClose={handleModalClose}
        onPaymentComplete={handlePaymentComplete}
        t={t}
      />
    </div>
  );
}
