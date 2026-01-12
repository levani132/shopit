'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../../../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface WishlistItem {
  _id: string;
  productId: string;
  name: string;
  price: number;
  salePrice?: number;
  image?: string;
  store?: {
    _id: string;
    name: string;
    subdomain: string;
  };
  inStock: boolean;
  addedAt: string;
}

export default function WishlistPage() {
  const t = useTranslations('dashboard');
  const { user, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/wishlist`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setItems(Array.isArray(data) ? data : data.items || []);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to load wishlist');
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setError('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchWishlist();
    } else {
      setLoading(false);
    }
  }, [authLoading, user, fetchWishlist]);

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try {
      const response = await fetch(`${API_URL}/api/v1/wishlist/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.productId !== productId));
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to remove item');
      }
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item');
    } finally {
      setRemovingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 bg-gray-200 dark:bg-zinc-700 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('myWishlist')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('myWishlistDescription')}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {items.length === 0 ? (
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('noWishlistItems')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('noWishlistItemsDescription')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden group"
            >
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100 dark:bg-zinc-700">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}

                {/* Out of Stock Overlay */}
                {!item.inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded">
                      {t('outOfStock')}
                    </span>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(item.productId)}
                  disabled={!!removingId}
                  className="absolute top-2 right-2 p-2 bg-white dark:bg-zinc-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500"
                >
                  {removingId === item.productId ? (
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Product Info */}
              <div className="p-4">
                {item.store && (
                  <a
                    href={`https://${item.store.subdomain}.shopit.ge`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-[var(--accent-500)] mb-1 block"
                  >
                    {item.store.name}
                  </a>
                )}
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {item.name}
                </h3>
                <div className="flex items-center gap-2">
                  {item.salePrice ? (
                    <>
                      <span className="text-lg font-semibold text-red-600">
                        ₾{item.salePrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        ₾{item.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      ₾{item.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {item.store && (
                <div className="px-4 pb-4">
                  <a
                    href={`https://${item.store.subdomain}.shopit.ge/products/${item.productId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 text-center text-sm font-medium rounded-lg transition-colors bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)]"
                  >
                    {t('viewProduct')}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

