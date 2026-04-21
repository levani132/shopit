'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { StoreData } from '../types/template.types.js';

// ---------------------------------------------------------------------------
// StoreData context
// ---------------------------------------------------------------------------

const StoreDataContext = createContext<StoreData | null>(null);

interface StoreDataProviderProps {
  store: StoreData;
  children: ReactNode;
}

export function StoreDataProvider({ store, children }: StoreDataProviderProps) {
  return (
    <StoreDataContext.Provider value={store}>
      {children}
    </StoreDataContext.Provider>
  );
}

export function useStoreData(): StoreData {
  const ctx = useContext(StoreDataContext);
  if (!ctx) {
    throw new Error('useStoreData must be used within a StoreDataProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Cart context
// ---------------------------------------------------------------------------

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export { CartContext };

interface CartProviderProps {
  value: CartContextValue;
  children: ReactNode;
}

export function CartProvider({ value, children }: CartProviderProps) {
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Locale context
// ---------------------------------------------------------------------------

const LocaleContext = createContext<string>('en');

interface LocaleProviderProps {
  locale: string;
  children: ReactNode;
}

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return (
    <LocaleContext.Provider value={locale}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): string {
  return useContext(LocaleContext);
}

// ---------------------------------------------------------------------------
// Template config context
// ---------------------------------------------------------------------------

const TemplateConfigContext = createContext<Record<string, unknown>>({});

interface TemplateConfigProviderProps {
  config: Record<string, unknown>;
  children: ReactNode;
}

export function TemplateConfigProvider({ config, children }: TemplateConfigProviderProps) {
  return (
    <TemplateConfigContext.Provider value={config}>
      {children}
    </TemplateConfigContext.Provider>
  );
}

export function useTemplateConfig(): Record<string, unknown> {
  return useContext(TemplateConfigContext);
}
