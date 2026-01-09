'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface VariantAttribute {
  attributeId: string;
  attributeName: string;
  valueId: string;
  value: string;
  colorHex?: string;
}

interface ProductVariant {
  _id: string;
  sku?: string;
  attributes: VariantAttribute[];
  price?: number;
  salePrice?: number;
  stock: number;
  images: string[];
  isActive: boolean;
}

interface ProductAttribute {
  attributeId: string;
  selectedValues: string[];
}

interface Attribute {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  type: 'text' | 'color';
  values: {
    _id: string;
    value: string;
    valueLocalized?: { ka?: string; en?: string };
    colorHex?: string;
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
  totalStock?: number;
  hasVariants: boolean;
  productAttributes: ProductAttribute[];
  variants: ProductVariant[];
  categoryId?: {
    _id: string;
    name: string;
    nameLocalized?: { ka?: string; en?: string };
  };
}

export default function ProductDetailPage() {
  const t = useTranslations('store');
  const tCommon = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Selected attribute values: { attributeId: valueId }
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});

  // Get localized text
  const getLocalizedText = (
    localized: { ka?: string; en?: string } | undefined,
    fallback: string,
  ) => {
    if (!localized) return fallback;
    return (locale === 'ka' ? localized.ka : localized.en) || fallback;
  };

  // Fetch product and attributes
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get store ID first
        const storeRes = await fetch(`${API_URL}/api/v1/stores/subdomain/${subdomain}`);
        if (!storeRes.ok) throw new Error('Store not found');
        const store = await storeRes.json();
        const storeId = store._id || store.id;

        // Fetch product
        const productRes = await fetch(
          `${API_URL}/api/v1/products/${productId}?storeId=${storeId}`,
        );
        if (!productRes.ok) throw new Error('Product not found');
        const productData = await productRes.json();
        setProduct(productData);

        // If product has variants, fetch attributes
        if (productData.hasVariants && productData.productAttributes?.length > 0) {
          const attrIds = productData.productAttributes.map(
            (pa: ProductAttribute) => String(pa.attributeId),
          );
          
          const attrsRes = await fetch(
            `${API_URL}/api/v1/attributes/store/${storeId}`,
          );
          if (attrsRes.ok) {
            const allAttrs = await attrsRes.json();
            
            // Filter to only attributes used by this product (compare as strings)
            const productAttrs = allAttrs.filter((attr: Attribute) =>
              attrIds.includes(String(attr._id)),
            );
            setAttributes(productAttrs);

            // Pre-select first variant's values if available
            if (productData.variants?.length > 0) {
              const firstVariant = productData.variants[0];
              const initialSelection: Record<string, string> = {};
              firstVariant.attributes.forEach((attr: VariantAttribute) => {
                initialSelection[attr.attributeId] = attr.valueId;
              });
              setSelectedValues(initialSelection);
            }
          }
        }

        // Track view
        fetch(`${API_URL}/api/v1/products/${productId}/view`, {
          method: 'POST',
        }).catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };

    if (subdomain && productId) {
      fetchProduct();
    }
  }, [subdomain, productId]);

  // Get available values for each attribute based on current selection
  const availableValues = useMemo(() => {
    if (!product?.hasVariants || !product.variants) return {};

    const result: Record<string, Set<string>> = {};

    // For each attribute, find which values are available given other selections
    attributes.forEach((attr) => {
      const otherSelections = { ...selectedValues };
      delete otherSelections[attr._id];

      // Find variants that match other selections
      const matchingVariants = product.variants.filter((variant) => {
        return Object.entries(otherSelections).every(([attrId, valueId]) => {
          return variant.attributes.some(
            (va) => va.attributeId === attrId && va.valueId === valueId,
          );
        });
      });

      // Get available values from matching variants
      result[attr._id] = new Set(
        matchingVariants
          .flatMap((v) => v.attributes)
          .filter((va) => va.attributeId === attr._id)
          .map((va) => va.valueId),
      );
    });

    return result;
  }, [product, attributes, selectedValues]);

  // Get currently selected variant
  const selectedVariant = useMemo(() => {
    if (!product?.hasVariants || !product.variants || attributes.length === 0)
      return null;

    return product.variants.find((variant) =>
      variant.attributes.every(
        (attr) => selectedValues[attr.attributeId] === attr.valueId,
      ),
    );
  }, [product, attributes, selectedValues]);

  // Get effective price and stock
  const effectivePrice = useMemo(() => {
    if (selectedVariant?.price !== undefined) return selectedVariant.price;
    return product?.price || 0;
  }, [product, selectedVariant]);

  const effectiveSalePrice = useMemo(() => {
    if (selectedVariant?.salePrice !== undefined) return selectedVariant.salePrice;
    return product?.salePrice;
  }, [product, selectedVariant]);

  const effectiveStock = useMemo(() => {
    if (selectedVariant) return selectedVariant.stock;
    if (product?.hasVariants) return product.totalStock || 0;
    return product?.stock || 0;
  }, [product, selectedVariant]);

  // Get images to display (variant images first, then general product images)
  const displayImages = useMemo(() => {
    const variantImages = selectedVariant?.images || [];
    const productImages = product?.images || [];
    
    // Combine variant images with product images, avoiding duplicates
    const allImages = [...variantImages];
    productImages.forEach((img) => {
      if (!allImages.includes(img)) {
        allImages.push(img);
      }
    });
    
    return allImages;
  }, [product, selectedVariant]);

  // Handle attribute value selection
  const handleValueSelect = (attributeId: string, valueId: string) => {
    setSelectedValues((prev) => ({
      ...prev,
      [attributeId]: valueId,
    }));
    // Reset image selection when variant changes
    setSelectedImage(0);
  };

  // Handle add to cart
  const handleAddToCart = () => {
    // TODO: Implement cart functionality
    console.log('Add to cart:', {
      productId: product?._id,
      variantId: selectedVariant?._id,
      quantity,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 dark:bg-zinc-700 rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-3/4" />
            <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded w-1/4" />
            <div className="h-24 bg-gray-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600 dark:text-red-400 text-lg">{error || 'Product not found'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-[var(--accent-600)] hover:underline"
        >
          {tCommon('goBack')}
        </button>
      </div>
    );
  }

  const isOnSale = product.isOnSale && effectiveSalePrice !== undefined;
  const displayPrice = isOnSale ? effectiveSalePrice : effectivePrice;
  const originalPrice = isOnSale ? effectivePrice : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        <button onClick={() => router.push(`/${locale}`)} className="hover:text-[var(--accent-600)]">
          {t('home')}
        </button>
        <span className="mx-2">/</span>
        <button onClick={() => router.push(`/${locale}/products`)} className="hover:text-[var(--accent-600)]">
          {t('products')}
        </button>
        {product.categoryId && (
          <>
            <span className="mx-2">/</span>
            <span>{getLocalizedText(product.categoryId.nameLocalized, product.categoryId.name)}</span>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
            {displayImages.length > 0 ? (
              <Image
                src={displayImages[selectedImage] || displayImages[0]}
                alt={getLocalizedText(product.nameLocalized, product.name)}
                fill
                className="object-contain"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-600">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {isOnSale && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-full">
                {t('sale')}
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {displayImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {displayImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === idx
                      ? 'border-[var(--accent-500)]'
                      : 'border-transparent hover:border-gray-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <Image src={img} alt={`${product.name} ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            {getLocalizedText(product.nameLocalized, product.name)}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              ₾{displayPrice.toFixed(2)}
            </span>
            {originalPrice !== undefined && (
              <span className="text-xl text-gray-500 line-through">
                ₾{originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div>
            {effectiveStock > 0 ? (
              <span className="inline-flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {t('inStock')} ({effectiveStock})
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-red-600 dark:text-red-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {t('outOfStock')}
              </span>
            )}
          </div>

          {/* Variant Selectors */}
          {product.hasVariants && attributes.length > 0 && (
            <div className="space-y-4 py-4 border-t border-b border-gray-200 dark:border-zinc-700">
              {attributes.map((attr) => {
                const productAttr = product.productAttributes.find(
                  (pa) => pa.attributeId === attr._id,
                );
                if (!productAttr) return null;

                const available = availableValues[attr._id] || new Set();
                const selectedValueId = selectedValues[attr._id];

                // Get the values that are actually used by this product
                const usedValues = attr.values.filter((v) =>
                  productAttr.selectedValues.includes(v._id),
                );

                return (
                  <div key={attr._id}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {getLocalizedText(attr.nameLocalized, attr.name)}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {usedValues.map((value) => {
                        const isAvailable = available.has(value._id);
                        const isSelected = selectedValueId === value._id;

                        if (attr.type === 'color' && value.colorHex) {
                          return (
                            <button
                              key={value._id}
                              onClick={() => handleValueSelect(attr._id, value._id)}
                              disabled={!isAvailable}
                              className={`w-10 h-10 rounded-full border-2 transition-all ${
                                isSelected
                                  ? 'border-[var(--accent-500)] ring-2 ring-[var(--accent-500)] ring-offset-2 dark:ring-offset-zinc-900'
                                  : isAvailable
                                    ? 'border-gray-300 dark:border-zinc-600 hover:border-[var(--accent-400)]'
                                    : 'border-gray-200 dark:border-zinc-700 opacity-30 cursor-not-allowed'
                              }`}
                              style={{ backgroundColor: value.colorHex }}
                              title={getLocalizedText(value.valueLocalized, value.value)}
                            />
                          );
                        }

                        return (
                          <button
                            key={value._id}
                            onClick={() => handleValueSelect(attr._id, value._id)}
                            disabled={!isAvailable}
                            className={`px-4 py-2 rounded-lg border transition-all ${
                              isSelected
                                ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-400)] font-medium'
                                : isAvailable
                                  ? 'border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:border-[var(--accent-400)]'
                                  : 'border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            }`}
                          >
                            {getLocalizedText(value.valueLocalized, value.value)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quantity & Add to Cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-300 dark:border-zinc-600 rounded-lg">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                −
              </button>
              <span className="px-4 py-2 text-gray-900 dark:text-white font-medium">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))}
                disabled={quantity >= effectiveStock}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={effectiveStock <= 0 || (product.hasVariants && !selectedVariant)}
              className="flex-1 px-6 py-3 bg-[var(--accent-600)] text-white font-medium rounded-lg hover:bg-[var(--accent-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {product.hasVariants && !selectedVariant
                ? t('selectVariant')
                : t('addToCart')}
            </button>
          </div>

          {/* Description */}
          {(product.descriptionLocalized || product.description) && (
            <div className="pt-6 border-t border-gray-200 dark:border-zinc-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                {t('description')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {getLocalizedText(product.descriptionLocalized, product.description || '')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

