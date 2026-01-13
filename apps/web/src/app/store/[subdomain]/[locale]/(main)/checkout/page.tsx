'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../../../../../../contexts/AuthContext';
import { useCart } from '../../../../../../contexts/CartContext';
import {
  useCheckout,
  ShippingAddress,
  GuestInfo,
} from '../../../../../../contexts/CheckoutContext';
import { getLocalizedText } from '../../../../../../lib/utils';
import { AddressPicker, AddressResult } from '../../../../../../components/ui/AddressPicker';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

// Payment awaiting modal component
function PaymentAwaitingModal({
  isOpen,
  orderId,
  paymentWindow,
  onPaymentComplete,
  onCancel,
  t,
}: {
  isOpen: boolean;
  orderId: string | null;
  paymentWindow: Window | null;
  onPaymentComplete: (success: boolean) => void;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  const [status, setStatus] = useState<
    'waiting' | 'success' | 'failed' | 'closed'
  >('waiting');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const windowCheckRef = useRef<NodeJS.Timeout | null>(null);

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
              onPaymentComplete(true);
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

    pollStatusWithRetry();
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
              onClick={onCancel}
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
              onClick={onCancel}
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
              onClick={() => onPaymentComplete(false)}
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

type CheckoutStep = 'auth' | 'guest' | 'delivery' | 'shipping' | 'review';
type DeliveryMethod = 'delivery' | 'pickup';

interface StoreInfo {
  id: string;
  address?: string;
  location?: { lat: number; lng: number };
  selfPickupEnabled?: boolean;
  courierType?: string;
}

interface ShippingEstimate {
  fee: number;
  durationMinutes: number;
  distanceKm: number;
  isLoading: boolean;
  error?: string;
}

export default function CheckoutPage() {
  const t = useTranslations('checkout');
  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');
  const params = useParams();
  const locale = (params?.locale as string) || 'ka';
  const subdomain = params?.subdomain as string;

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { items: cart, clearCart } = useCart();
  const {
    shippingAddress,
    setShippingAddress,
    guestInfo,
    setGuestInfo,
    clearCheckout,
  } = useCheckout();

  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('auth');
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Delivery method state
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>('delivery');
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [paymentWindowRef, setPaymentWindowRef] = useState<Window | null>(null);

  // Form states
  const [guestForm, setGuestForm] = useState<GuestInfo>({
    email: '',
    phoneNumber: '',
    fullName: '',
  });
  const [addressForm, setAddressForm] = useState<ShippingAddress>({
    label: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Georgia',
    phoneNumber: '',
  });
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Shipping estimate state
  const [shippingEstimate, setShippingEstimate] = useState<ShippingEstimate>({
    fee: 0,
    durationMinutes: 0,
    distanceKm: 0,
    isLoading: false,
  });

  // Address picker value for the map
  const [addressPickerValue, setAddressPickerValue] = useState<
    AddressResult | undefined
  >(undefined);

  // Calculate totals
  const storeItems = useMemo(
    () => cart.filter((item) => item.storeId === subdomain || true), // For now, show all
    [cart, subdomain],
  );

  const itemsPrice = useMemo(
    () =>
      storeItems.reduce(
        (sum, item) =>
          sum +
          (item.isOnSale && item.salePrice ? item.salePrice : item.price) *
            item.quantity,
        0,
      ),
    [storeItems],
  );

  // Shipping price: 0 for self-pickup or self-delivery, calculated for ShopIt
  const shippingPrice = useMemo(() => {
    if (deliveryMethod === 'pickup') return 0;
    if (storeInfo?.courierType === 'seller') return 0; // Self-delivery is free
    return shippingEstimate.fee; // ShopIt calculated fee
  }, [deliveryMethod, storeInfo?.courierType, shippingEstimate.fee]);

  const totalPrice = itemsPrice + shippingPrice;

  // Fetch saved addresses when authenticated
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!isAuthenticated || addressesLoaded) return;

      try {
        const response = await fetch(`${API_URL}/api/v1/auth/addresses`, {
          credentials: 'include',
        });
        if (response.ok) {
          const addresses = await response.json();
          setSavedAddresses(addresses);

          // Auto-select default address
          const defaultAddr = addresses.find(
            (a: ShippingAddress) => a.isDefault,
          );
          if (defaultAddr && !shippingAddress) {
            setShippingAddress(defaultAddr);
          }
        }
      } catch (err) {
        console.error('Error fetching addresses:', err);
      } finally {
        setAddressesLoaded(true);
      }
    };

    fetchAddresses();
  }, [isAuthenticated, addressesLoaded, shippingAddress, setShippingAddress]);

  // Fetch store info for self-pickup
  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/v1/stores/subdomain/${subdomain}`,
        );
        if (response.ok) {
          const data = await response.json();
          setStoreInfo({
            id: data._id || data.id,
            address: data.address,
            location: data.location,
            selfPickupEnabled: data.selfPickupEnabled,
            courierType: data.courierType,
          });
        }
      } catch (err) {
        console.error('Error fetching store info:', err);
      }
    };

    if (subdomain) {
      fetchStoreInfo();
    }
  }, [subdomain]);

  // Check if self-pickup is available
  const selfPickupAvailable =
    storeInfo?.selfPickupEnabled && storeInfo?.address;

  // Auto-advance steps (skip when user is explicitly editing address/delivery)
  useEffect(() => {
    if (authLoading) return;
    if (isEditingAddress) return; // Don't auto-advance when user is editing

    if (isAuthenticated) {
      if (!addressesLoaded) return;
      // If self-pickup is available, go to delivery method selection first
      if (selfPickupAvailable && currentStep === 'auth') {
        setCurrentStep('delivery');
      } else if (deliveryMethod === 'pickup') {
        // For self-pickup, skip shipping address and go to review
        setCurrentStep('review');
      } else if (!shippingAddress) {
        setCurrentStep('shipping');
      } else {
        setCurrentStep('review');
      }
    } else if (isGuestCheckout) {
      if (!guestInfo) {
        setCurrentStep('guest');
      } else if (selfPickupAvailable && currentStep === 'guest') {
        setCurrentStep('delivery');
      } else if (deliveryMethod === 'pickup') {
        setCurrentStep('review');
      } else if (!shippingAddress) {
        setCurrentStep('shipping');
      } else {
        setCurrentStep('review');
      }
    } else {
      setCurrentStep('auth');
    }
  }, [
    authLoading,
    isAuthenticated,
    isGuestCheckout,
    guestInfo,
    shippingAddress,
    addressesLoaded,
    selfPickupAvailable,
    deliveryMethod,
    currentStep,
    isEditingAddress,
  ]);

  // Handle guest info submit
  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGuestInfo(guestForm);
    // If self-pickup is available, go to delivery method selection
    if (selfPickupAvailable) {
      setCurrentStep('delivery');
    } else {
      setCurrentStep('shipping');
    }
  };

  // Handle delivery method selection
  const handleDeliveryMethodSelect = (method: DeliveryMethod) => {
    setDeliveryMethod(method);
    if (method === 'pickup') {
      // For self-pickup, skip shipping and go to review
      setIsEditingAddress(false);
      setCurrentStep('review');
    } else {
      // Keep editing mode active if user chose delivery - they'll need to select address
      setCurrentStep('shipping');
    }
  };

  // Handle address selection
  const selectAddress = (address: ShippingAddress) => {
    setShippingAddress(address);
    setShowNewAddressForm(false);
    setEditingAddressId(null);
    setIsEditingAddress(false);
    setAddressPickerValue(undefined);
    // Calculate shipping if address has location
    if (address.location) {
      calculateShipping(address.location);
    }
    setCurrentStep('review');
  };

  // Handle edit address - populate form with existing data
  const handleEditAddress = (addr: ShippingAddress) => {
    setAddressForm({
      address: addr.address,
      city: addr.city,
      postalCode: addr.postalCode || '',
      country: addr.country,
      phoneNumber: addr.phoneNumber,
      label: addr.label || '',
      isDefault: addr.isDefault || false,
      location: addr.location,
    });
    // Set address picker value if we have location
    if (addr.location) {
      setAddressPickerValue({
        address: addr.address,
        location: addr.location,
      });
      // Calculate shipping for the existing address
      calculateShipping(addr.location);
    } else {
      setAddressPickerValue(undefined);
    }
    setEditingAddressId(addr._id || null);
    setShowNewAddressForm(true);
  };

  // Handle address form submit (new or edit)
  const handleAddressFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAuthenticated) {
      try {
        if (editingAddressId) {
          // Update existing address
          const response = await fetch(
            `${API_URL}/api/v1/auth/addresses/${editingAddressId}`,
            {
              method: 'PUT',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(addressForm),
            },
          );

          if (response.ok) {
            const updatedAddress = await response.json();
            setSavedAddresses(
              savedAddresses.map((a) =>
                a._id === editingAddressId ? updatedAddress : a,
              ),
            );
            selectAddress(updatedAddress);
            setEditingAddressId(null);
          }
        } else if (saveNewAddress) {
          // Create new address
        const response = await fetch(`${API_URL}/api/v1/auth/addresses`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addressForm),
        });

        if (response.ok) {
          const newAddress = await response.json();
          setSavedAddresses([...savedAddresses, newAddress]);
          selectAddress(newAddress);
          }
        } else {
          // Use address without saving
          selectAddress({ ...addressForm, _id: 'temp' });
        }
      } catch (err) {
        console.error('Error saving address:', err);
        selectAddress({ ...addressForm, _id: 'temp' });
      }
    } else {
      selectAddress({ ...addressForm, _id: 'temp' });
    }
  };

  // Cancel address form
  const cancelAddressForm = () => {
    setShowNewAddressForm(false);
    setEditingAddressId(null);
    setAddressForm({
      address: '',
      city: '',
      postalCode: '',
      country: 'Georgia',
      phoneNumber: '',
      label: '',
      isDefault: false,
    });
    setAddressPickerValue(undefined);
  };

  // Calculate shipping fee based on distance
  const calculateShipping = useCallback(
    async (customerLocation: { lat: number; lng: number }) => {
      // Only calculate if store uses ShopIt delivery and has location
      if (!storeInfo?.location || storeInfo.courierType !== 'shopit') {
        setShippingEstimate((prev) => ({ ...prev, fee: 0, isLoading: false }));
        return;
      }

      setShippingEstimate((prev) => ({ ...prev, isLoading: true, error: undefined }));

      // Send product IDs so backend fetches current sizes from database
      const products = storeItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      try {
        const response = await fetch(`${API_URL}/api/v1/orders/calculate-shipping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeLocation: storeInfo.location,
            customerLocation,
            products, // Send product IDs for DB lookup
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setShippingEstimate({
            fee: data.fee,
            durationMinutes: data.durationMinutes,
            distanceKm: data.distanceKm,
            isLoading: false,
          });
        } else {
          setShippingEstimate((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Failed to calculate shipping',
          }));
        }
      } catch (err) {
        console.error('Error calculating shipping:', err);
        setShippingEstimate((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to calculate shipping',
        }));
      }
    },
    [storeInfo, storeItems],
  );

  // Calculate shipping when shippingAddress changes (e.g., on initial load with saved address)
  useEffect(() => {
    if (
      shippingAddress?.location &&
      storeInfo?.courierType === 'shopit' &&
      storeInfo?.location
    ) {
      calculateShipping(shippingAddress.location);
    }
  }, [shippingAddress, storeInfo, calculateShipping]);

  // Handle address picker change
  const handleAddressPickerChange = (result: AddressResult) => {
    setAddressPickerValue(result);
    // Extract city from address (simple heuristic - look for common Georgian cities)
    const addressParts = result.address.split(',').map((p) => p.trim());
    let city = 'Tbilisi'; // Default
    const georgianCities = [
      'Tbilisi',
      'თბილისი',
      'Batumi',
      'ბათუმი',
      'Kutaisi',
      'ქუთაისი',
      'Rustavi',
      'რუსთავი',
      'Gori',
      'გორი',
      'Zugdidi',
      'ზუგდიდი',
      'Poti',
      'ფოთი',
      'Telavi',
      'თელავი',
    ];
    for (const part of addressParts) {
      if (georgianCities.some((c) => part.toLowerCase().includes(c.toLowerCase()))) {
        city = part;
        break;
      }
    }

    setAddressForm((prev) => ({
      ...prev,
      address: result.address,
      city,
      location: result.location,
    }));

    // Calculate shipping if we have the location
    if (result.location) {
      calculateShipping(result.location);
    }
  };

  // Process checkout
  const handleCheckout = async () => {
    // For self-pickup, we don't need shipping address
    if (deliveryMethod === 'delivery' && !shippingAddress) return;
    if (storeItems.length === 0) return;

    // For ShopIt delivery, require location on shipping address
    if (
      deliveryMethod === 'delivery' &&
      storeInfo?.courierType === 'shopit' &&
      !shippingAddress?.location
    ) {
      setError(t('locationRequiredError'));
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Create order
      const orderPayload = {
        orderItems: storeItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          nameEn: item.nameLocalized?.en || item.name, // Include English name for localization
          image: item.image || '/placeholder.webp',
          price: item.isOnSale && item.salePrice ? item.salePrice : item.price,
          qty: item.quantity,
          variantId: item.variantId,
          // Only send the fields the backend expects (attributeName, value, colorHex)
          variantAttributes: item.variantAttributes?.map((attr) => ({
            attributeName: attr.attributeName,
            value: attr.value,
            colorHex: attr.colorHex,
          })),
          storeId: item.storeId,
          storeName: item.storeName,
        })),
        // For self-pickup, use store address; for delivery, use shipping address
        shippingDetails:
          deliveryMethod === 'pickup'
            ? {
                address: storeInfo?.address || 'Self Pickup',
                city: 'Self Pickup',
                postalCode: '',
                country: 'Georgia',
                phoneNumber: guestInfo?.phoneNumber || user?.phoneNumber || '',
              }
            : {
                address: shippingAddress!.address,
                city: shippingAddress!.city,
                postalCode: shippingAddress!.postalCode,
                country: shippingAddress!.country,
                phoneNumber: shippingAddress!.phoneNumber,
                // Include location for ShopIt delivery fee calculation
                location: shippingAddress!.location,
              },
        deliveryMethod, // 'delivery' or 'pickup'
        paymentMethod: 'BOG',
        isGuestOrder: !isAuthenticated,
        guestInfo: !isAuthenticated ? guestInfo : undefined,
      };

      const orderResponse = await fetch(`${API_URL}/api/v1/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const order = await orderResponse.json();

      // 2. Initiate payment
      const paymentPayload = {
        orderId: order._id,
        totalPrice: order.totalPrice,
        items: storeItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.salePrice || item.price,
        })),
        customer: isAuthenticated
          ? {
              firstName: user?.firstName,
              lastName: user?.lastName,
              email: user?.email,
            }
          : {
              firstName: guestInfo?.fullName.split(' ')[0],
              lastName: guestInfo?.fullName.split(' ').slice(1).join(' '),
              email: guestInfo?.email,
              phone: guestInfo?.phoneNumber,
            },
        successUrl: `${window.location.origin}/store/${subdomain}/${locale}/checkout/success`,
        failUrl: `${window.location.origin}/store/${subdomain}/${locale}/checkout/fail`,
      };

      const paymentResponse = await fetch(
        `${API_URL}/api/v1/payments/initiate`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentPayload),
        },
      );

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.message || 'Failed to initiate payment');
      }

      const paymentData = await paymentResponse.json();

      // 3. Open BOG payment page in popup/new tab
      if (paymentData.redirectUrl) {
        // Clear cart and checkout state
        clearCart();
        clearCheckout();

        // Store order ID for polling
        setCurrentOrderId(order._id);

        // Open payment in new tab
        const paymentWindow = window.open(
          paymentData.redirectUrl,
          '_blank',
          'width=600,height=700',
        );

        // If popup was blocked, redirect in same window
        if (!paymentWindow) {
          window.location.href = paymentData.redirectUrl;
          return;
        }

        // Store window reference for close detection
        setPaymentWindowRef(paymentWindow);

        // Show payment awaiting modal
        setPaymentModalOpen(true);
      } else {
        throw new Error('No payment URL received');
      }
    } catch (err: unknown) {
      console.error('Checkout error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred during checkout',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle payment completion
  const handlePaymentComplete = useCallback(
    (success: boolean) => {
      setPaymentModalOpen(false);
      setCurrentOrderId(null);
      setPaymentWindowRef(null);

      if (success) {
        // Redirect to orders page
        router.push(`/${locale}/orders`);
      }
    },
    [router, locale],
  );

  // Handle payment cancel (window closed or user clicked cancel)
  const handlePaymentCancel = useCallback(() => {
    // Close the payment window if still open
    if (paymentWindowRef && !paymentWindowRef.closed) {
      paymentWindowRef.close();
    }
    setPaymentModalOpen(false);
    setCurrentOrderId(null);
    setPaymentWindowRef(null);
    // Redirect to orders so user can retry from there
    router.push(`/${locale}/orders`);
  }, [paymentWindowRef, router, locale]);

  // Show payment modal when cart is empty but payment is in progress
  if (storeItems.length === 0 && paymentModalOpen) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Payment Awaiting Modal */}
        <PaymentAwaitingModal
          isOpen={paymentModalOpen}
          orderId={currentOrderId}
          paymentWindow={paymentWindowRef}
          onPaymentComplete={handlePaymentComplete}
          onCancel={handlePaymentCancel}
          t={t}
        />
      </div>
    );
  }

  // Empty cart check
  if (storeItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('emptyCart')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('emptyCartDescription')}
        </p>
        <Link
          href={`/${locale}/products`}
          className="inline-block px-6 py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
        >
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
        {t('title')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main checkout flow */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Auth/Guest */}
          {currentStep === 'auth' && !authLoading && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('accountStep')}
              </h2>

              <div className="space-y-4">
                <Link
                  href={`/${locale}/login?returnUrl=/${locale}/checkout`}
                  className="block w-full text-center py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
                >
                  {t('loginToContinue')}
                </Link>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-zinc-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400">
                      {t('or')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsGuestCheckout(true)}
                  className="block w-full text-center py-3 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  {t('continueAsGuest')}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Guest Info */}
          {currentStep === 'guest' && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('contactInfo')}
              </h2>

              <form onSubmit={handleGuestSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('fullName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestForm.fullName}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, fullName: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('email')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={guestForm.email}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('phone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestForm.phoneNumber}
                    onChange={(e) =>
                      setGuestForm({
                        ...guestForm,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
                >
                  {t('continue')}
                </button>
              </form>
            </div>
          )}

          {/* Step 2.5: Delivery Method (when self-pickup is available) */}
          {currentStep === 'delivery' && selfPickupAvailable && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('deliveryMethod')}
              </h2>

              <div className="space-y-3">
                {/* Home Delivery Option */}
                <button
                  onClick={() => handleDeliveryMethodSelect('delivery')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    deliveryMethod === 'delivery'
                      ? 'border-[var(--store-accent-500)] bg-[var(--store-accent-50)] dark:bg-[var(--store-accent-900)]/20'
                      : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t('homeDelivery')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('homeDeliveryDescription')}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Self Pickup Option */}
                <button
                  onClick={() => handleDeliveryMethodSelect('pickup')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    deliveryMethod === 'pickup'
                      ? 'border-[var(--store-accent-500)] bg-[var(--store-accent-50)] dark:bg-[var(--store-accent-900)]/20'
                      : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-green-600 dark:text-green-400"
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
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {tDashboard('selfPickupOption')}
                        </p>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          {tDashboard('selfPickupFree')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('selfPickupDescription')}
                      </p>
                      {storeInfo?.address && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {tDashboard('selfPickupAddress')}:
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {storeInfo.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Shipping Address */}
          {currentStep === 'shipping' && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('shippingAddress')}
              </h2>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && !showNewAddressForm && (
                <div className="space-y-3 mb-4">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr._id}
                      className={`w-full p-4 rounded-lg border-2 transition-colors ${
                        shippingAddress?._id === addr._id
                          ? 'border-[var(--store-accent-500)] bg-[var(--store-accent-50)] dark:bg-[var(--store-accent-900)]'
                          : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        {/* Clickable area for selection */}
                        <button
                          type="button"
                          onClick={() => selectAddress(addr)}
                          className="flex-1 text-left"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {addr.label || t('address')}
                            {addr.isDefault && (
                              <span className="ml-2 text-xs text-[var(--store-accent-600)]">
                                ({t('default')})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {addr.address}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {addr.city}, {addr.country}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {addr.phoneNumber}
                          </p>
                        </button>

                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAddress(addr);
                          }}
                          className="p-2 text-gray-500 hover:text-[var(--store-accent-600)] dark:text-gray-400 dark:hover:text-[var(--store-accent-400)] transition-colors"
                          title={t('edit')}
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
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        </div>
                      </div>
                  ))}
                </div>
              )}

              {/* New address button */}
              {!showNewAddressForm && (
                <button
                  onClick={() => setShowNewAddressForm(true)}
                  className="w-full py-3 border border-dashed border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-gray-400 dark:hover:border-zinc-500 transition-colors"
                >
                  + {t('addNewAddress')}
                </button>
              )}

              {/* Address form (new or edit) */}
              {showNewAddressForm && (
                <form onSubmit={handleAddressFormSubmit} className="space-y-4">
                  {/* Form title */}
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">
                    {editingAddressId ? t('editAddress') : t('addNewAddress')}
                  </h3>
                  {/* Address Picker with Map */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('fullAddress')} *
                      </label>
                    <AddressPicker
                      value={
                        addressPickerValue ||
                        (addressForm.address && addressForm.location
                          ? {
                              address: addressForm.address,
                              location: addressForm.location,
                            }
                          : undefined)
                      }
                      onChange={handleAddressPickerChange}
                      placeholder={t('searchAddress')}
                    />
                    {/* Show calculated shipping info for ShopIt delivery */}
                    {storeInfo?.courierType === 'shopit' &&
                      addressForm.location && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                          {shippingEstimate.isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <svg
                                className="w-4 h-4 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
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
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              {t('calculatingShipping')}
                            </div>
                          ) : shippingEstimate.error ? (
                            <p className="text-sm text-red-500">
                              {shippingEstimate.error}
                            </p>
                          ) : (
                            <div className="flex items-center justify-between text-sm">
                              <div className="text-gray-600 dark:text-gray-400">
                                <span className="font-medium">
                                  {t('estimatedDelivery')}:
                                </span>{' '}
                                {t('deliveryDays', { days: '1-3' })}
                              </div>
                              <div className="font-semibold text-[var(--store-accent-600)]">
                                ₾{shippingEstimate.fee.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('phone')} *
                      </label>
                      <input
                        type="tel"
                        required
                        value={addressForm.phoneNumber}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            phoneNumber: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('country')}
                      </label>
                      <select
                        value={addressForm.country}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            country: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      >
                        <option value="Georgia">{t('georgia')}</option>
                      </select>
                    </div>
                  </div>

                  {isAuthenticated && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveNewAddress}
                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--store-accent-500)' }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {t('saveAddress')}
                      </span>
                    </label>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors"
                    >
                      {editingAddressId ? t('updateAddress') : t('useThisAddress')}
                    </button>
                    {(savedAddresses.length > 0 || editingAddressId) && (
                      <button
                        type="button"
                        onClick={cancelAddressForm}
                        className="px-6 py-3 border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                      >
                        {tCommon('cancel')}
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Step 4: Review & Pay */}
          {currentStep === 'review' && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('reviewOrder')}
              </h2>

              {/* Delivery method summary */}
              {deliveryMethod === 'pickup' ? (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-green-800 dark:text-green-300">
                          {tDashboard('selfPickupOption')}
                        </p>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          {tDashboard('selfPickupFree')}
                        </span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        {tDashboard('selfPickupAddress')}:
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        {storeInfo?.address}
                      </p>
                    </div>
                    {selfPickupAvailable && (
                      <button
                        onClick={() => {
                          setIsEditingAddress(true);
                          setCurrentStep('delivery');
                        }}
                        className="text-sm text-green-600 dark:text-green-400 hover:underline"
                      >
                        {t('change')}
                      </button>
                    )}
                  </div>
                </div>
              ) : shippingAddress ? (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t('shippingTo')}:
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {shippingAddress.address}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {shippingAddress.city}, {shippingAddress.country}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {shippingAddress.phoneNumber}
                      </p>
                      {/* Warning if ShopIt delivery but no location */}
                      {storeInfo?.courierType === 'shopit' &&
                        !shippingAddress.location && (
                          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
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
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            {t('locationRequiredWarning')}
                          </p>
                        )}
                    </div>
                    <button
                      onClick={() => {
                        setIsEditingAddress(true);
                        setCurrentStep(
                          selfPickupAvailable ? 'delivery' : 'shipping',
                        );
                      }}
                      className="text-sm text-[var(--store-accent-600)] hover:underline"
                    >
                      {t('change')}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Payment method */}
              <div className="mb-6">
                <p className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('paymentMethod')}
                </p>
                <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-zinc-600 rounded-lg">
                  {/* Card icon */}
                  <div className="w-10 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('georgianBankCard')}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full py-4 bg-[var(--store-accent-500)] text-white rounded-lg hover:bg-[var(--store-accent-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
              >
                {isProcessing ? t('processing') : t('payNow')} - ₾
                {totalPrice.toFixed(2)}
              </button>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-700 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('orderSummary')}
            </h2>

            <div className="space-y-4 mb-6">
              {storeItems.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="flex gap-3"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-700 flex-shrink-0">
                    <Image
                      src={item.image || '/placeholder.webp'}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {getLocalizedText(item.nameLocalized, item.name, locale)}
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
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        x{item.quantity}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        ₾
                        {(
                          (item.isOnSale && item.salePrice
                            ? item.salePrice
                            : item.price) * item.quantity
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{t('subtotal')}</span>
                <span>₾{itemsPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{t('shipping')}</span>
                <span>
                  {deliveryMethod === 'pickup' ? (
                    // Self-pickup is free
                    t('free')
                  ) : storeInfo?.courierType === 'seller' ? (
                    // Seller delivery is free
                    t('free')
                  ) : !shippingAddress?.location ? (
                    // No address selected yet - prompt user
                    <span className="text-amber-600 dark:text-amber-400 text-xs">
                      {t('selectAddressToCalculate')}
                    </span>
                  ) : shippingEstimate.isLoading ? (
                    // Calculating...
                    <span className="text-gray-400">{t('calculating')}...</span>
                  ) : shippingPrice > 0 ? (
                    // Show calculated price
                    `₾${shippingPrice.toFixed(2)}`
                  ) : (
                    // Fallback
                    <span className="text-amber-600 dark:text-amber-400 text-xs">
                      {t('selectAddressToCalculate')}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-zinc-700">
                <span>{t('total')}</span>
                <span>₾{totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Awaiting Modal */}
      <PaymentAwaitingModal
        isOpen={paymentModalOpen}
        orderId={currentOrderId}
        paymentWindow={paymentWindowRef}
        onPaymentComplete={handlePaymentComplete}
        onCancel={handlePaymentCancel}
        t={t}
      />
    </div>
  );
}
