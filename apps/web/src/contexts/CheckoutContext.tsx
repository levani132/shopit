'use client';

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
} from 'react';

export interface ShippingAddress {
  _id?: string;
  label?: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  phoneNumber: string;
  isDefault?: boolean;
}

export interface GuestInfo {
  email: string;
  phoneNumber: string;
  fullName: string;
}

interface CheckoutContextType {
  // Shipping
  shippingAddress: ShippingAddress | null;
  setShippingAddress: (address: ShippingAddress | null) => void;

  // Guest info
  guestInfo: GuestInfo | null;
  setGuestInfo: (info: GuestInfo | null) => void;

  // Payment
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;

  // Clear
  clearCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(
  undefined,
);

export const CheckoutProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [shippingAddress, setShippingAddress] =
    useState<ShippingAddress | null>(null);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('BOG');

  const clearCheckout = useCallback(() => {
    setShippingAddress(null);
    setGuestInfo(null);
    setPaymentMethod('BOG');
  }, []);

  const value = useMemo(
    () => ({
      shippingAddress,
      setShippingAddress,
      guestInfo,
      setGuestInfo,
      paymentMethod,
      setPaymentMethod,
      clearCheckout,
    }),
    [shippingAddress, guestInfo, paymentMethod, clearCheckout],
  );

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
};

