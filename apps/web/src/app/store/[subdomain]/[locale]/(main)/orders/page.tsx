'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '../../../../../../contexts/AuthContext';
import { OrderCard, Order } from '../../../../../../components/orders';

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

    // Track if window was detected as closed
    let windowClosedDetected = false;
    let retryCount = 0;
    const MAX_RETRIES_AFTER_CLOSE = 5; // Keep polling for ~10 seconds after window closes

    // Check if payment window was closed
    const checkWindowClosed = () => {
      if (
        paymentWindow &&
        paymentWindow.closed &&
        status === 'waiting' &&
        !windowClosedDetected
      ) {
        windowClosedDetected = true;
        // Stop window check interval but keep polling for payment status
        if (windowCheckRef.current) {
          clearInterval(windowCheckRef.current);
          windowCheckRef.current = null;
        }
        console.log('Payment window closed, continuing to poll for status...');
      }
    };

    // Enhanced poll that handles window close
    const pollStatusWithRetry = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/v1/payments/order-status/${orderId}`,
          { credentials: 'include' },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.isPaid) {
            setStatus('success');
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            setTimeout(() => {
              onPaymentComplete(orderId, 'paid');
            }, 2000);
            return;
          } else if (data.status === 'cancelled') {
            setStatus('failed');
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            return;
          }
        }

        // If window was closed and we've retried enough times, show closed status
        if (windowClosedDetected) {
          retryCount++;
          if (retryCount >= MAX_RETRIES_AFTER_CLOSE) {
            setStatus('closed');
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    };

    // Start polling every 2 seconds
    pollStatusWithRetry(); // Initial check
    pollIntervalRef.current = setInterval(pollStatusWithRetry, 2000);

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

export default function OrdersPage() {
  const t = useTranslations('orders');
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';
  const subdomain = params?.subdomain as string;

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  // Filter orders - hide cancelled by default
  const filteredOrders = useMemo(() => {
    if (showCancelled) return orders;
    return orders.filter((order) => order.status !== 'cancelled');
  }, [orders, showCancelled]);

  // Check if there are any cancelled orders
  const hasCancelledOrders = useMemo(() => {
    return orders.some((order) => order.status === 'cancelled');
  }, [orders]);

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

  // Show empty state when all visible orders are filtered out (only cancelled)
  if (filteredOrders.length === 0 && hasCancelledOrders) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-[var(--store-accent-500)] focus:ring-[var(--store-accent-500)]"
            />
            {t('showCancelledOrders')}
          </label>
        </div>
        <div className="text-center py-12">
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('onlyCancelledOrders')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        {hasCancelledOrders && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-[var(--store-accent-500)] focus:ring-[var(--store-accent-500)]"
            />
            {t('showCancelledOrders')}
          </label>
        )}
      </div>

      <div className="space-y-6">
        {filteredOrders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            locale={locale}
            t={t}
            onPayNow={handlePayNow}
            processingPayment={processingPayment}
            productLinkBase={`/${locale}`}
          />
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
