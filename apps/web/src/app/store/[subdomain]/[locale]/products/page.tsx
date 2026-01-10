'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface CategoryData {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  slug: string;
  subcategories: {
    _id: string;
    name: string;
    nameLocalized?: { ka?: string; en?: string };
    slug: string;
  }[];
}

interface Product {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  description?: string;
  descriptionLocalized?: { ka?: string; en?: string };
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  images: string[];
  stock: number;
  viewCount: number;
  categoryId?: {
    _id: string;
    name: string;
    nameLocalized?: { ka?: string; en?: string };
  };
  subcategoryId?: {
    _id: string;
    name: string;
    nameLocalized?: { ka?: string; en?: string };
  };
}

interface AttributeFilterValue {
  valueId: string;
  value: string;
  valueSlug: string;
  colorHex?: string;
  count: number;
}

interface AttributeFilter {
  _id: string;
  attributeId: string;
  attributeName: string;
  attributeSlug: string;
  attributeType: 'text' | 'color';
  values: AttributeFilterValue[];
  totalProducts: number;
}

interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    priceRange: {
      minPrice: number;
      maxPrice: number;
    };
  };
}

type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'popularity' | 'newest';

export default function StoreProductsPage() {
  const t = useTranslations('store');
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<AttributeFilter[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters from URL
  const categoryId = searchParams.get('category') || '';
  const subcategoryId = searchParams.get('subcategory') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = (searchParams.get('sortBy') as SortOption) || 'relevance';
  const search = searchParams.get('search') || '';
  const onSale = searchParams.get('onSale') === 'true';
  const inStock = searchParams.get('inStock') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const attributes = searchParams.get('attributes') || ''; // Format: attrSlug:valueSlug,valueSlug|attrSlug:valueSlug

  // Parse selected attributes for easy access
  const selectedAttributes: Record<string, string[]> = {};
  if (attributes) {
    attributes.split('|').forEach((attrGroup) => {
      const [attrSlug, values] = attrGroup.split(':');
      if (attrSlug && values) {
        selectedAttributes[attrSlug] = values.split(',');
      }
    });
  }

  // Get localized text
  const getLocalizedText = (
    localized: { ka?: string; en?: string } | undefined,
    fallback: string
  ) => {
    if (localized) {
      return (locale === 'ka' ? localized.ka : localized.en) || fallback;
    }
    return fallback;
  };

  // Fetch store and categories
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        // Fetch store to get ID
        const storeRes = await fetch(`${API_URL}/api/v1/stores/subdomain/${subdomain}`);
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          setStoreId(storeData.id);

          // Fetch categories
          const catRes = await fetch(`${API_URL}/api/v1/categories/store/${storeData.id}`);
          if (catRes.ok) {
            const catData = await catRes.json();
            setCategories(catData);
          }
        }
      } catch (err) {
        console.error('Error fetching store data:', err);
      }
    };

    fetchStoreData();
  }, [subdomain]);

  // Fetch attribute filters based on current category or store-level
  useEffect(() => {
    if (!storeId) return;

    const fetchAttributeFilters = async () => {
      try {
        // Use category-specific filters if a category is selected, otherwise store-level
        const filterUrl = categoryId
          ? `${API_URL}/api/v1/categories/${subcategoryId || categoryId}/filters/${storeId}`
          : `${API_URL}/api/v1/categories/filters/store/${storeId}`;

        const res = await fetch(filterUrl);
        if (res.ok) {
          const data = await res.json();
          setAttributeFilters(data);
        } else {
          setAttributeFilters([]);
        }
      } catch (err) {
        console.error('Error fetching attribute filters:', err);
        setAttributeFilters([]);
      }
    };

    fetchAttributeFilters();
  }, [storeId, categoryId, subcategoryId]);

  // Fetch products
  useEffect(() => {
    if (!storeId) return;

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (categoryId) queryParams.set('categoryId', categoryId);
        if (subcategoryId) queryParams.set('subcategoryId', subcategoryId);
        if (minPrice) queryParams.set('minPrice', minPrice);
        if (maxPrice) queryParams.set('maxPrice', maxPrice);
        if (sortBy) queryParams.set('sortBy', sortBy);
        if (search) queryParams.set('search', search);
        if (onSale) queryParams.set('onSale', 'true');
        if (inStock) queryParams.set('inStock', 'true');
        if (attributes) queryParams.set('attributes', attributes);
        queryParams.set('page', page.toString());

        const res = await fetch(
          `${API_URL}/api/v1/products/store/${storeId}?${queryParams.toString()}`
        );
        if (res.ok) {
          const data: ProductsResponse = await res.json();
          setProducts(data.products);
          setPagination(data.pagination);
          setPriceRange({
            min: data.filters.priceRange.minPrice,
            max: data.filters.priceRange.maxPrice,
          });
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [storeId, categoryId, subcategoryId, minPrice, maxPrice, sortBy, search, onSale, inStock, attributes, page]);

  // Update URL params
  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });

      // Reset page when filters change (except when changing page itself)
      if (!('page' in updates)) {
        newParams.delete('page');
      }

      router.push(`?${newParams.toString()}`);
    },
    [searchParams, router]
  );

  // Toggle attribute value selection
  const toggleAttributeValue = useCallback(
    (attrSlug: string, valueSlug: string) => {
      // Parse current attributes from URL to avoid stale closure
      const currentAttributes = searchParams.get('attributes') || '';
      const currentSelected: Record<string, string[]> = {};
      if (currentAttributes) {
        currentAttributes.split('|').forEach((attrGroup) => {
          const [slug, values] = attrGroup.split(':');
          if (slug && values) {
            currentSelected[slug] = values.split(',');
          }
        });
      }

      // Toggle the value
      if (!currentSelected[attrSlug]) {
        currentSelected[attrSlug] = [valueSlug];
      } else if (currentSelected[attrSlug].includes(valueSlug)) {
        currentSelected[attrSlug] = currentSelected[attrSlug].filter(
          (v) => v !== valueSlug
        );
        if (currentSelected[attrSlug].length === 0) {
          delete currentSelected[attrSlug];
        }
      } else {
        currentSelected[attrSlug].push(valueSlug);
      }

      // Build new attributes string
      const attrParts = Object.entries(currentSelected).map(
        ([slug, values]) => `${slug}:${values.join(',')}`
      );
      const newAttributesString = attrParts.length > 0 ? attrParts.join('|') : null;

      updateFilters({ attributes: newAttributesString });
    },
    [searchParams, updateFilters]
  );

  // Track product view
  const trackView = async (productId: string) => {
    try {
      await fetch(`${API_URL}/api/v1/products/${productId}/view`, { method: 'POST' });
    } catch (err) {
      console.error('Error tracking view:', err);
    }
  };

  // Get selected category/subcategory names for breadcrumb
  const selectedCategory = categories.find((c) => c._id === categoryId);
  const selectedSubcategory = selectedCategory?.subcategories.find((s) => s._id === subcategoryId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('products')}
            </h1>
            {/* Breadcrumb */}
            {(selectedCategory || search) && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <button
                  onClick={() => updateFilters({ category: null, subcategory: null, search: null })}
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  {t('all')}
                </button>
                {selectedCategory && (
                  <>
                    <span>/</span>
                    <button
                      onClick={() => updateFilters({ subcategory: null })}
                      className="hover:text-gray-900 dark:hover:text-white"
                    >
                      {getLocalizedText(selectedCategory.nameLocalized, selectedCategory.name)}
                    </button>
                  </>
                )}
                {selectedSubcategory && (
                  <>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-white">
                      {getLocalizedText(selectedSubcategory.nameLocalized, selectedSubcategory.name)}
                    </span>
                  </>
                )}
                {search && (
                  <>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-white">
                      &quot;{search}&quot;
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Sort and Filter buttons */}
          <div className="flex items-center gap-3">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
              className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white"
            >
              <option value="relevance">Relevance</option>
              <option value="popularity">Popularity</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside
            className={`${
              filtersOpen ? 'block' : 'hidden'
            } md:block w-full md:w-64 flex-shrink-0`}
          >
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Filters
              </h3>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('categories')}
                  </h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => updateFilters({ category: null, subcategory: null })}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm ${
                        !categoryId
                          ? 'bg-gray-100 dark:bg-zinc-700 font-medium'
                          : 'hover:bg-gray-50 dark:hover:bg-zinc-700'
                      } text-gray-700 dark:text-gray-300`}
                    >
                      {t('all')}
                    </button>
                    {categories.map((cat) => (
                      <div key={cat._id}>
                        <button
                          onClick={() => updateFilters({ category: cat._id, subcategory: null })}
                          className={`block w-full text-left px-3 py-2 rounded-lg text-sm ${
                            categoryId === cat._id && !subcategoryId
                              ? 'bg-gray-100 dark:bg-zinc-700 font-medium'
                              : 'hover:bg-gray-50 dark:hover:bg-zinc-700'
                          } text-gray-700 dark:text-gray-300`}
                        >
                          {getLocalizedText(cat.nameLocalized, cat.name)}
                        </button>
                        {/* Subcategories */}
                        {categoryId === cat._id && cat.subcategories.length > 0 && (
                          <div className="ml-4 mt-1 space-y-1">
                            {cat.subcategories.map((sub) => (
                              <button
                                key={sub._id}
                                onClick={() => updateFilters({ subcategory: sub._id })}
                                className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm ${
                                  subcategoryId === sub._id
                                    ? 'text-[var(--store-accent-600)] font-medium'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                              >
                                {getLocalizedText(sub.nameLocalized, sub.name)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Price Range
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={`${priceRange.min}`}
                    value={minPrice ?? ''}
                    onChange={(e) => updateFilters({ minPrice: e.target.value || null })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder={`${priceRange.max}`}
                    value={maxPrice ?? ''}
                    onChange={(e) => updateFilters({ maxPrice: e.target.value || null })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onSale}
                    onChange={(e) => updateFilters({ onSale: e.target.checked ? 'true' : null })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600"
                    style={{ accentColor: 'var(--store-accent-500)' }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">On Sale</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => updateFilters({ inStock: e.target.checked ? 'true' : null })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600"
                    style={{ accentColor: 'var(--store-accent-500)' }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">In Stock</span>
                </label>
              </div>

              {/* Attribute Filters */}
              {attributeFilters.length > 0 && (
                <div className="space-y-6">
                  {attributeFilters.map((attr) => (
                    <div key={attr._id} className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {attr.attributeName}
                      </h4>
                      {attr.attributeType === 'color' ? (
                        // Color swatches
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((value) => {
                            const isSelected = selectedAttributes[attr.attributeSlug]?.includes(value.valueSlug);
                            return (
                              <button
                                key={value.valueId}
                                onClick={() => toggleAttributeValue(attr.attributeSlug, value.valueSlug)}
                                className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                                  isSelected
                                    ? 'border-[var(--store-accent-500)] ring-2 ring-[var(--store-accent-300)]'
                                    : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400'
                                }`}
                                style={{ backgroundColor: value.colorHex || '#ccc' }}
                                title={`${value.value} (${value.count})`}
                              >
                                {isSelected && (
                                  <svg
                                    className="absolute inset-0 m-auto w-4 h-4"
                                    fill="none"
                                    stroke={value.colorHex && parseInt(value.colorHex.slice(1), 16) < 0x808080 ? 'white' : 'black'}
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        // Text/checkbox filters
                        <div className="space-y-2">
                          {attr.values.map((value) => {
                            const isSelected = selectedAttributes[attr.attributeSlug]?.includes(value.valueSlug) ?? false;
                            return (
                              <label key={value.valueId} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleAttributeValue(attr.attributeSlug, value.valueSlug)}
                                  className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600"
                                  style={{ accentColor: 'var(--store-accent-500)' }}
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {value.value}
                                </span>
                                <span className="text-xs text-gray-400">({value.count})</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Clear Filters */}
              {(categoryId || subcategoryId || minPrice || maxPrice || onSale || inStock || search || attributes) && (
                <button
                  onClick={() =>
                    updateFilters({
                      category: null,
                      subcategory: null,
                      minPrice: null,
                      maxPrice: null,
                      onSale: null,
                      inStock: null,
                      search: null,
                      attributes: null,
                    })
                  }
                  className="mt-6 w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-zinc-700 rounded-lg"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-gray-200 dark:bg-zinc-700 rounded-xl mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <div
                  className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, var(--store-accent-100) 0%, var(--store-accent-200) 100%)`,
                  }}
                >
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: 'var(--store-accent-500)' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('noProducts')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('noProductsDescription')}
                </p>
              </div>
            ) : (
              <>
                {/* Results count */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Showing {products.length} of {pagination.total} products
                </p>

                {/* Products grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <a
                      key={product._id}
                      href={`/${locale}/products/${product._id}`}
                      onClick={() => trackView(product._id)}
                      className="group bg-white dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-gray-100 dark:bg-zinc-700 overflow-hidden">
                        {product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={getLocalizedText(product.nameLocalized, product.name)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, var(--store-accent-100) 0%, var(--store-accent-200) 100%)`,
                            }}
                          >
                            <svg
                              className="w-16 h-16 opacity-40"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              style={{ color: 'var(--store-accent-500)' }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          {product.isOnSale && (
                            <span
                              className="text-xs font-medium px-2 py-1 rounded-full text-white"
                              style={{ backgroundColor: 'var(--store-accent-500)' }}
                            >
                              Sale
                            </span>
                          )}
                          {product.stock === 0 && (
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-900/80 text-white">
                              {t('outOfStock')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        {product.categoryId && (
                          <span
                            className="text-xs font-medium uppercase tracking-wide"
                            style={{ color: 'var(--store-accent-600)' }}
                          >
                            {getLocalizedText(
                              product.categoryId.nameLocalized,
                              product.categoryId.name
                            )}
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1 mb-2 line-clamp-1">
                          {getLocalizedText(product.nameLocalized, product.name)}
                        </h3>
                        <div className="flex items-center gap-2">
                          {product.isOnSale && product.salePrice ? (
                            <>
                              <span className="text-xl font-bold text-gray-900 dark:text-white">
                                ₾{product.salePrice}
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                ₾{product.price}
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-gray-900 dark:text-white">
                              ₾{product.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => updateFilters({ page: String(page - 1) })}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => updateFilters({ page: String(page + 1) })}
                      disabled={page === pagination.totalPages}
                      className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

