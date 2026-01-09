'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '../../../../i18n/routing';
import { apiUrl } from '../../../../lib/api';

interface ProductData {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  stock: number;
  isActive: boolean;
  images: string[];
  categoryId?: { name: string; nameLocalized?: { ka?: string; en?: string } };
  createdAt: string;
  // Variant support
  hasVariants?: boolean;
  totalStock?: number;
  variants?: { stock: number }[];
}

type SortField = 'name' | 'price' | 'stock' | 'status';
type SortDirection = 'asc' | 'desc';

export default function ProductsPage() {
  const t = useTranslations('dashboard');
  const [products, setProducts] = useState<ProductData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(`${apiUrl}/products/my-store`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default asc direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          const nameA = (a.nameLocalized?.en || a.name).toLowerCase();
          const nameB = (b.nameLocalized?.en || b.name).toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case 'price':
          const priceA = a.isOnSale && a.salePrice ? a.salePrice : a.price;
          const priceB = b.isOnSale && b.salePrice ? b.salePrice : b.price;
          comparison = priceA - priceB;
          break;
        case 'stock':
          // Use totalStock for variant products, stock for simple products
          const stockA = a.hasVariants ? (a.totalStock ?? 0) : a.stock;
          const stockB = b.hasVariants ? (b.totalStock ?? 0) : b.stock;
          comparison = stockA - stockB;
          break;
        case 'status':
          // Active (true) comes before Draft (false) in ascending order
          comparison = (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [products, sortField, sortDirection]);

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-64 mb-8" />
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-zinc-800 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            {t('products')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('manageProducts')}
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="px-4 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('addProduct')}
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[var(--accent-600)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('noProductsYet')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              {t('noProductsDescription')}
            </p>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('addFirstProduct')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm overflow-hidden">
          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
              <thead className="bg-gray-50 dark:bg-zinc-800">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors group select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      {t('product')}
                      <SortIndicator field="name" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors group select-none"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center">
                      {t('price')}
                      <SortIndicator field="price" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors group select-none"
                    onClick={() => handleSort('stock')}
                  >
                    <div className="flex items-center">
                      {t('stock')}
                      <SortIndicator field="stock" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors group select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      {t('status')}
                      <SortIndicator field="status" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {sortedProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {product.images?.[0] ? (
                            <img
                              className="h-12 w-12 rounded-lg object-cover"
                              src={product.images[0]}
                              alt={product.name}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {product.nameLocalized?.en || product.name}
                          </div>
                          {product.categoryId && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {product.categoryId.nameLocalized?.en || product.categoryId.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {product.isOnSale && product.salePrice ? (
                          <>
                            <span className="text-red-600 font-medium">₾{product.salePrice}</span>
                            <span className="ml-2 text-gray-400 line-through">₾{product.price}</span>
                          </>
                        ) : (
                          <span>₾{product.price}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const effectiveStock = product.hasVariants 
                          ? (product.totalStock ?? 0) 
                          : product.stock;
                        return (
                          <div className="flex flex-col">
                            <span className={`text-sm ${effectiveStock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {effectiveStock > 0 ? `${effectiveStock} ${t('inStock')}` : t('outOfStock')}
                            </span>
                            {product.hasVariants && product.variants && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {product.variants.length} {t('variants').toLowerCase()}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        product.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-400'
                      }`}>
                        {product.isActive ? t('active') : t('draft')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/products/${product._id}`}
                        className="text-[var(--accent-600)] hover:text-[var(--accent-700)] mr-4"
                      >
                        {t('edit')}
                      </Link>
                      <button
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          // TODO: Delete confirmation
                        }}
                      >
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

