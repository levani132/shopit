'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

// Cart item represents a product (optionally with a specific variant)
export interface CartItem {
  productId: string;
  variantId?: string; // null for non-variant products
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  image?: string;
  quantity: number;
  stock: number; // Max available stock
  // Variant-specific info
  variantAttributes?: {
    attributeId: string;
    attributeName: string;
    valueId: string;
    value: string;
    colorHex?: string;
  }[];
  // Store info for multi-store support
  storeId: string;
  storeName: string;
  storeSubdomain: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  clearStoreCart: (storeId: string) => void;
  
  // Helpers
  getItemQuantity: (productId: string, variantId?: string) => number;
  isInCart: (productId: string, variantId?: string) => boolean;
  getStoreItems: (storeId: string) => CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'sellit_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
      }
    }
  }, [items, isInitialized]);

  // Add item to cart
  const addItem = useCallback(
    (newItem: Omit<CartItem, 'quantity'>, quantity = 1) => {
      setItems((prevItems) => {
        const existingIndex = prevItems.findIndex(
          (item) =>
            item.productId === newItem.productId &&
            item.variantId === newItem.variantId
        );

        if (existingIndex >= 0) {
          // Update existing item quantity
          const updated = [...prevItems];
          const existing = updated[existingIndex];
          const newQuantity = Math.min(
            existing.quantity + quantity,
            existing.stock
          );
          updated[existingIndex] = { ...existing, quantity: newQuantity };
          return updated;
        } else {
          // Add new item
          const finalQuantity = Math.min(quantity, newItem.stock);
          return [...prevItems, { ...newItem, quantity: finalQuantity }];
        }
      });
    },
    []
  );

  // Remove item from cart
  const removeItem = useCallback((productId: string, variantId?: string) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(item.productId === productId && item.variantId === variantId)
      )
    );
  }, []);

  // Update item quantity
  const updateQuantity = useCallback(
    (productId: string, variantId: string | undefined, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, variantId);
        return;
      }

      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.productId === productId && item.variantId === variantId) {
            const newQuantity = Math.min(quantity, item.stock);
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
      );
    },
    [removeItem]
  );

  // Clear entire cart
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Clear cart for a specific store
  const clearStoreCart = useCallback((storeId: string) => {
    setItems((prevItems) =>
      prevItems.filter((item) => item.storeId !== storeId)
    );
  }, []);

  // Get quantity for a specific item
  const getItemQuantity = useCallback(
    (productId: string, variantId?: string) => {
      const item = items.find(
        (i) => i.productId === productId && i.variantId === variantId
      );
      return item?.quantity || 0;
    },
    [items]
  );

  // Check if item is in cart
  const isInCart = useCallback(
    (productId: string, variantId?: string) => {
      return items.some(
        (item) =>
          item.productId === productId && item.variantId === variantId
      );
    },
    [items]
  );

  // Get items for a specific store
  const getStoreItems = useCallback(
    (storeId: string) => {
      return items.filter((item) => item.storeId === storeId);
    },
    [items]
  );

  // Computed values
  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = item.isOnSale && item.salePrice ? item.salePrice : item.price;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const value: CartContextType = {
    items,
    itemCount,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    clearStoreCart,
    getItemQuantity,
    isInCart,
    getStoreItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

