'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MockPaymentStatus = 'idle' | 'redirecting' | 'processing' | 'success' | 'failed' | 'cancelled';

export interface MockPaymentRequest {
  orderId: string;
  totalPrice: number;
  currency?: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface MockPaymentResult {
  orderId: string;
  bogOrderId: string;
  status: 'completed' | 'failed' | 'cancelled';
  timestamp: string;
}

interface MockPaymentContextValue {
  /** Current payment status */
  status: MockPaymentStatus;
  /** The current payment request (if any) */
  currentPayment: MockPaymentRequest | null;
  /** Latest payment result */
  lastResult: MockPaymentResult | null;
  /** Initiate a simulated payment — shows the mock BOG page */
  initiatePayment: (request: MockPaymentRequest) => void;
  /** Simulate the user completing payment successfully */
  completePayment: () => void;
  /** Simulate the user cancelling payment */
  cancelPayment: () => void;
  /** Simulate a payment failure */
  failPayment: () => void;
  /** Reset to idle state */
  reset: () => void;
}

const MockPaymentContext = createContext<MockPaymentContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMockPayment(): MockPaymentContextValue {
  const ctx = useContext(MockPaymentContext);
  if (!ctx) {
    throw new Error('useMockPayment must be used within a MockPaymentProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface MockPaymentProviderProps {
  /** Artificial delay in ms before payment completes (default: 1500) */
  delay?: number;
  /** Called when payment completes successfully */
  onSuccess?: (result: MockPaymentResult) => void;
  /** Called when payment fails or is cancelled */
  onFail?: (result: MockPaymentResult) => void;
  children: ReactNode;
}

export function MockPaymentProvider({
  delay = 1500,
  onSuccess,
  onFail,
  children,
}: MockPaymentProviderProps) {
  const [status, setStatus] = useState<MockPaymentStatus>('idle');
  const [currentPayment, setCurrentPayment] = useState<MockPaymentRequest | null>(null);
  const [lastResult, setLastResult] = useState<MockPaymentResult | null>(null);

  const buildResult = useCallback(
    (payment: MockPaymentRequest, outcome: 'completed' | 'failed' | 'cancelled'): MockPaymentResult => ({
      orderId: payment.orderId,
      bogOrderId: `mock_bog_${Date.now()}`,
      status: outcome,
      timestamp: new Date().toISOString(),
    }),
    [],
  );

  const initiatePayment = useCallback((request: MockPaymentRequest) => {
    setCurrentPayment(request);
    setStatus('redirecting');
    // Simulate network delay then show payment UI
    setTimeout(() => setStatus('processing'), 500);
  }, []);

  const completePayment = useCallback(() => {
    if (!currentPayment) return;
    setStatus('redirecting');
    setTimeout(() => {
      const result = buildResult(currentPayment, 'completed');
      setLastResult(result);
      setStatus('success');
      onSuccess?.(result);
    }, delay);
  }, [currentPayment, delay, onSuccess, buildResult]);

  const cancelPayment = useCallback(() => {
    if (!currentPayment) return;
    const result = buildResult(currentPayment, 'cancelled');
    setLastResult(result);
    setStatus('cancelled');
    onFail?.(result);
  }, [currentPayment, onFail, buildResult]);

  const failPayment = useCallback(() => {
    if (!currentPayment) return;
    const result = buildResult(currentPayment, 'failed');
    setLastResult(result);
    setStatus('failed');
    onFail?.(result);
  }, [currentPayment, onFail, buildResult]);

  const reset = useCallback(() => {
    setStatus('idle');
    setCurrentPayment(null);
    setLastResult(null);
  }, []);

  return (
    <MockPaymentContext.Provider
      value={{ status, currentPayment, lastResult, initiatePayment, completePayment, cancelPayment, failPayment, reset }}
    >
      {children}
      {/* Render mock BOG payment overlay when processing */}
      {(status === 'processing' || status === 'redirecting') && currentPayment && (
        <MockBogPaymentOverlay
          payment={currentPayment}
          status={status}
          onComplete={completePayment}
          onCancel={cancelPayment}
          onFail={failPayment}
        />
      )}
    </MockPaymentContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Mock BOG Payment Overlay — simulates the BOG payment page
// ---------------------------------------------------------------------------

function MockBogPaymentOverlay({
  payment,
  status,
  onComplete,
  onCancel,
  onFail,
}: {
  payment: MockPaymentRequest;
  status: MockPaymentStatus;
  onComplete: () => void;
  onCancel: () => void;
  onFail: () => void;
}) {
  const currency = payment.currency || 'GEL';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header — BOG style */}
        <div
          style={{
            background: '#003366',
            color: '#fff',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            &#x1f3e6; Bank of Georgia
          </div>
          <div
            style={{
              background: '#ff6600',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Mock Payment
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {status === 'redirecting' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: '4px solid #e5e7eb',
                  borderTopColor: '#003366',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'mock-bog-spin 0.8s linear infinite',
                }}
              />
              <p style={{ color: '#6b7280', fontSize: 14 }}>Redirecting to payment...</p>
              <style>{`@keyframes mock-bog-spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Order ID</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{payment.orderId}</div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Items</div>
                {payment.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 14,
                      padding: '4px 0',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <span style={{ color: '#374151' }}>
                      {item.name} × {item.quantity}
                    </span>
                    <span style={{ color: '#111', fontWeight: 500 }}>
                      {(item.price * item.quantity).toFixed(2)} {currency}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderTop: '2px solid #e5e7eb',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                <span>Total</span>
                <span>{payment.totalPrice.toFixed(2)} {currency}</span>
              </div>

              {/* Mock card form */}
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '12px 16px',
                    fontSize: 13,
                    color: '#6b7280',
                    textAlign: 'center',
                    marginBottom: 16,
                  }}
                >
                  This is a simulated payment page for template development.
                  <br />
                  No real transaction will be processed.
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  onClick={onComplete}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Complete Payment
                </button>
                <button
                  onClick={onFail}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✗ Fail Payment
                </button>
              </div>
              <button
                onClick={onCancel}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '10px',
                  background: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
