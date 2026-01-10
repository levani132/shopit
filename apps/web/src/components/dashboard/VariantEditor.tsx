'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '../../i18n/routing';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface AttributeValue {
  _id: string;
  value: string;
  valueLocalized?: { ka?: string; en?: string };
  colorHex?: string;
  order: number;
}

interface Attribute {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  slug: string;
  type: 'text' | 'color';
  requiresImage: boolean;
  values: AttributeValue[];
  order: number;
}

interface ProductAttribute {
  attributeId: string;
  selectedValues: string[];
}

interface VariantAttribute {
  attributeId: string;
  attributeName: string;
  valueId: string;
  value: string;
  colorHex?: string;
}

interface ProductVariant {
  _id?: string;
  sku?: string;
  attributes: VariantAttribute[];
  price?: number;
  salePrice?: number;
  stock: number;
  images: string[];
  isActive: boolean;
}

interface ImageGroup {
  key: string; // Unique key for the group (e.g., "color-red")
  label: string; // Display label (e.g., "Red")
  attributes: {
    attributeId: string;
    valueId: string;
    value: string;
    colorHex?: string;
  }[];
  images: string[];
  previewImages: { file: File; preview: string }[];
  totalStock: number; // Sum of stock for all variants in this group
}

interface VariantEditorProps {
  hasVariants: boolean;
  productAttributes: ProductAttribute[];
  variants: ProductVariant[];
  onHasVariantsChange: (hasVariants: boolean) => void;
  onProductAttributesChange: (attributes: ProductAttribute[]) => void;
  onVariantsChange: (variants: ProductVariant[]) => void;
  variantImageFiles: Map<string, File[]>; // Map of imageGroupKey -> File[]
  onVariantImageFilesChange: (files: Map<string, File[]>) => void;
}

function getLocalizedText(
  localized: { ka?: string; en?: string } | undefined,
  fallback: string,
  locale: string,
): string {
  if (!localized) return fallback;
  return (locale === 'ka' ? localized.ka : localized.en) || fallback;
}

export default function VariantEditor({
  hasVariants,
  productAttributes,
  variants,
  onHasVariantsChange,
  onProductAttributesChange,
  onVariantsChange,
  variantImageFiles,
  onVariantImageFilesChange,
}: VariantEditorProps) {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<
    Map<string, { file: File; preview: string }[]>
  >(new Map());
  const fileInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());

  // Compute image groups based on requiresImage attributes
  const imageGroups = useMemo<ImageGroup[]>(() => {
    if (!hasVariants || variants.length === 0) return [];

    // Find attributes that require images
    const imageRequiringAttrs = attributes.filter(
      (attr) =>
        attr.requiresImage &&
        productAttributes.some((pa) => pa.attributeId === attr._id),
    );

    if (imageRequiringAttrs.length === 0) return [];

    // Group variants by their image-requiring attribute values
    const groupMap = new Map<string, ImageGroup>();

    for (const variant of variants) {
      // Get the image-requiring attributes for this variant
      const imageAttrs = variant.attributes.filter((va) =>
        imageRequiringAttrs.some((attr) => attr._id === va.attributeId),
      );

      if (imageAttrs.length === 0) continue;

      // Create a unique key based on the image-requiring attribute values
      const key = imageAttrs
        .sort((a, b) => a.attributeId.localeCompare(b.attributeId))
        .map((a) => `${a.attributeId}-${a.valueId}`)
        .join('|');

      if (!groupMap.has(key)) {
        // Build a label for this group
        const labelParts = imageAttrs.map((a) => a.value);
        groupMap.set(key, {
          key,
          label: labelParts.join(' / '),
          attributes: imageAttrs.map((a) => ({
            attributeId: a.attributeId,
            valueId: a.valueId,
            value: a.value,
            colorHex: a.colorHex,
          })),
          images: variant.images || [],
          previewImages: [],
          totalStock: variant.stock || 0,
        });
      } else {
        // Add stock from this variant to the group
        const existingGroup = groupMap.get(key)!;
        existingGroup.totalStock += variant.stock || 0;
      }
    }

    return Array.from(groupMap.values());
  }, [hasVariants, variants, attributes, productAttributes]);

  // Handle image upload for a group
  const handleImageUpload = (groupKey: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const newPreviews = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    // Update preview images
    setPreviewImages((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(groupKey) || [];
      updated.set(groupKey, [...existing, ...newPreviews]);
      return updated;
    });

    // Update variant image files
    const updatedFiles = new Map(variantImageFiles);
    const existingFiles = updatedFiles.get(groupKey) || [];
    updatedFiles.set(groupKey, [...existingFiles, ...newFiles]);
    onVariantImageFilesChange(updatedFiles);
  };

  // Remove an image from a group
  const removeImage = (groupKey: string, index: number, isPreview: boolean) => {
    if (isPreview) {
      // Remove from preview images
      setPreviewImages((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(groupKey) || [];
        // Revoke the URL to prevent memory leaks
        URL.revokeObjectURL(existing[index].preview);
        updated.set(
          groupKey,
          existing.filter((_, i) => i !== index),
        );
        return updated;
      });

      // Remove from variant image files
      const updatedFiles = new Map(variantImageFiles);
      const existingFiles = updatedFiles.get(groupKey) || [];
      updatedFiles.set(
        groupKey,
        existingFiles.filter((_, i) => i !== index),
      );
      onVariantImageFilesChange(updatedFiles);
    } else {
      // Remove existing image URL from variants
      const updatedVariants = variants.map((variant) => {
        // Check if this variant belongs to this group
        const variantKey = variant.attributes
          .filter((va) =>
            imageGroups.some(
              (g) =>
                g.key === groupKey &&
                g.attributes.some(
                  (a) =>
                    a.attributeId === va.attributeId &&
                    a.valueId === va.valueId,
                ),
            ),
          )
          .sort((a, b) => a.attributeId.localeCompare(b.attributeId))
          .map((a) => `${a.attributeId}-${a.valueId}`)
          .join('|');

        if (variantKey === groupKey && variant.images) {
          return {
            ...variant,
            images: variant.images.filter((_, i) => i !== index),
          };
        }
        return variant;
      });
      onVariantsChange(updatedVariants);
    }
  };

  // Get all images for a group (existing + preview)
  const getGroupImages = (
    groupKey: string,
  ): { url: string; isPreview: boolean; index: number }[] => {
    const group = imageGroups.find((g) => g.key === groupKey);
    const existingImages = (group?.images || []).map((url, index) => ({
      url,
      isPreview: false,
      index,
    }));
    const previews = (previewImages.get(groupKey) || []).map((p, index) => ({
      url: p.preview,
      isPreview: true,
      index,
    }));
    return [...existingImages, ...previews];
  };

  // Fetch available attributes
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/api/v1/attributes/my-store`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAttributes(data);
        }
      } catch (err) {
        console.error('Error fetching attributes:', err);
        setError('Failed to load attributes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttributes();
  }, []);

  // Toggle attribute selection
  const toggleAttribute = (attributeId: string) => {
    const existing = productAttributes.find(
      (pa) => pa.attributeId === attributeId,
    );
    if (existing) {
      // Remove attribute
      onProductAttributesChange(
        productAttributes.filter((pa) => pa.attributeId !== attributeId),
      );
    } else {
      // Add attribute with no values selected
      onProductAttributesChange([
        ...productAttributes,
        { attributeId, selectedValues: [] },
      ]);
    }
  };

  // Toggle value selection for an attribute
  const toggleValue = (attributeId: string, valueId: string) => {
    const updatedAttributes = productAttributes.map((pa) => {
      if (pa.attributeId !== attributeId) return pa;

      const hasValue = pa.selectedValues.includes(valueId);
      return {
        ...pa,
        selectedValues: hasValue
          ? pa.selectedValues.filter((v) => v !== valueId)
          : [...pa.selectedValues, valueId],
      };
    });

    onProductAttributesChange(updatedAttributes);
  };

  // Generate variants from selected attributes
  const generateVariants = useCallback(() => {
    // Get attributes with selected values
    const selectedAttrs = productAttributes.filter(
      (pa) => pa.selectedValues.length > 0,
    );

    if (selectedAttrs.length === 0) {
      onVariantsChange([]);
      return;
    }

    // Build arrays for each attribute's selected values
    const valueArrays = selectedAttrs.map((pa) => {
      const attr = attributes.find((a) => a._id === pa.attributeId);
      if (!attr) return [];

      return pa.selectedValues.map((valueId) => {
        const value = attr.values.find((v) => v._id === valueId);
        return {
          attributeId: attr._id,
          attributeName: getLocalizedText(attr.nameLocalized, attr.name, 'en'),
          valueId,
          value: value
            ? getLocalizedText(value.valueLocalized, value.value, 'en')
            : valueId,
          colorHex: value?.colorHex,
        };
      });
    });

    // Generate Cartesian product
    const cartesian = <T,>(arrays: T[][]): T[][] => {
      if (arrays.length === 0) return [[]];
      if (arrays.length === 1) return arrays[0].map((item) => [item]);
      return arrays.reduce<T[][]>(
        (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
        [[]],
      );
    };

    const combinations = cartesian(valueArrays);

    // Create variants, preserving existing data where possible
    const newVariants: ProductVariant[] = combinations.map((combo) => {
      // Check if this exact combination already exists
      const existingVariant = variants.find(
        (v) =>
          v.attributes.length === combo.length &&
          v.attributes.every((attr) =>
            combo.some(
              (c) =>
                c.attributeId === attr.attributeId &&
                c.valueId === attr.valueId,
            ),
          ),
      );

      if (existingVariant) {
        return { ...existingVariant, attributes: combo };
      }

      return {
        attributes: combo,
        stock: 0,
        images: [],
        isActive: true,
      };
    });

    onVariantsChange(newVariants);
  }, [productAttributes, attributes, variants, onVariantsChange]);

  // Update variant stock
  const updateVariantStock = (index: number, stock: number) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], stock };
    onVariantsChange(updatedVariants);
  };

  // Check if an attribute is selected
  const isAttributeSelected = (attributeId: string) => {
    return productAttributes.some((pa) => pa.attributeId === attributeId);
  };

  // Check if a value is selected
  const isValueSelected = (attributeId: string, valueId: string) => {
    const pa = productAttributes.find((p) => p.attributeId === attributeId);
    return pa?.selectedValues.includes(valueId) ?? false;
  };

  // Calculate total stock
  const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-zinc-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('variants')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('variantsDescription')}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Enable Variants Toggle */}
      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => onHasVariantsChange(e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-gray-300 dark:border-zinc-600"
            style={{ accentColor: 'var(--accent-500)' }}
          />
          <div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {t('enableVariants')}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t('enableVariantsDescription')}
            </p>
          </div>
        </label>
      </div>

      {hasVariants && (
        <>
          {attributes.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-300 dark:border-zinc-600 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('noAttributesForVariants')}
              </p>
              <Link
                href="/dashboard/attributes"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors"
              >
                {t('createAttributesFirst')}
              </Link>
            </div>
          ) : (
            <>
              {/* Attribute Selection */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('selectAttributes')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {attributes.map((attr) => (
                    <button
                      key={attr._id}
                      type="button"
                      onClick={() => toggleAttribute(attr._id)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        isAttributeSelected(attr._id)
                          ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30 border-[var(--accent-500)] text-[var(--accent-700)] dark:text-[var(--accent-400)]'
                          : 'border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-zinc-500'
                      }`}
                    >
                      {getLocalizedText(attr.nameLocalized, attr.name, locale)}
                      {attr.type === 'color' && (
                        <span className="ml-2 text-xs opacity-60">🎨</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value Selection for Selected Attributes */}
              {productAttributes.length > 0 && (
                <div className="mb-6 space-y-4">
                  {productAttributes.map((pa) => {
                    const attr = attributes.find(
                      (a) => a._id === pa.attributeId,
                    );
                    if (!attr) return null;

                    return (
                      <div
                        key={pa.attributeId}
                        className="p-4 border border-gray-200 dark:border-zinc-700 rounded-lg"
                      >
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {getLocalizedText(
                            attr.nameLocalized,
                            attr.name,
                            locale,
                          )}{' '}
                          - {t('selectValues')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((value) => (
                            <button
                              key={value._id}
                              type="button"
                              onClick={() => toggleValue(attr._id, value._id)}
                              className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 ${
                                isValueSelected(attr._id, value._id)
                                  ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30 border-[var(--accent-500)] text-[var(--accent-700)] dark:text-[var(--accent-400)]'
                                  : 'border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-zinc-500'
                              }`}
                            >
                              {attr.type === 'color' && value.colorHex && (
                                <span
                                  className="w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-600"
                                  style={{ backgroundColor: value.colorHex }}
                                />
                              )}
                              {getLocalizedText(
                                value.valueLocalized,
                                value.value,
                                locale,
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Generate Variants Button */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={generateVariants}
                  disabled={productAttributes.every(
                    (pa) => pa.selectedValues.length === 0,
                  )}
                  className="px-4 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {variants.length > 0
                    ? t('regenerateVariants')
                    : t('generateVariants')}
                </button>
              </div>

              {/* Variants List */}
              {variants.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('variantConfiguration')} ({variants.length}{' '}
                      {t('totalVariants').toLowerCase()})
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {t('totalVariantStock')}: {totalStock}
                    </span>
                  </div>

                  {/* Bulk Stock Assignment */}
                  <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('setAllStock')}:
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      id="bulk-stock-input"
                      className="w-24 px-3 py-1.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById(
                          'bulk-stock-input',
                        ) as HTMLInputElement;
                        const value = parseInt(input?.value || '0', 10);
                        if (!isNaN(value) && value >= 0) {
                          const updatedVariants = variants.map((v) => ({
                            ...v,
                            stock: value,
                          }));
                          onVariantsChange(updatedVariants);
                        }
                      }}
                      className="px-3 py-1.5 bg-[var(--accent-600)] text-white text-sm rounded-lg hover:bg-[var(--accent-700)] transition-colors"
                    >
                      {t('applyToAll')}
                    </button>
                  </div>

                  <div className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-zinc-900/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('variantCombination')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                            {t('stock')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                        {variants.map((variant, index) => (
                          <tr
                            key={variant._id || index}
                            className="hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                {variant.attributes.map((attr, attrIndex) => (
                                  <span
                                    key={attrIndex}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-zinc-700 rounded text-sm"
                                  >
                                    {attr.colorHex && (
                                      <span
                                        className="w-3 h-3 rounded-full border border-gray-300 dark:border-zinc-600"
                                        style={{
                                          backgroundColor: attr.colorHex,
                                        }}
                                      />
                                    )}
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {attr.attributeName}:
                                    </span>
                                    <span className="text-gray-900 dark:text-white font-medium">
                                      {attr.value}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                value={variant.stock ?? 0}
                                onChange={(e) =>
                                  updateVariantStock(
                                    index,
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-24 px-3 py-1.5 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                productAttributes.some(
                  (pa) => pa.selectedValues.length > 0,
                ) && (
                  <div className="text-center py-6 border border-dashed border-gray-300 dark:border-zinc-600 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('noVariantsDescription')}
                    </p>
                  </div>
                )
              )}

              {/* Variant Images Section */}
              {variants.length > 0 && imageGroups.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {t('variantImages')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {t('variantImagesDescription')}
                  </p>

                  <div className="space-y-6">
                    {imageGroups.map((group) => {
                      const groupImages = getGroupImages(group.key);

                      return (
                        <div
                          key={group.key}
                          className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4"
                        >
                          {/* Group Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {group.attributes.map((attr, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-700 rounded-lg"
                                >
                                  {attr.colorHex && (
                                    <span
                                      className="w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-600"
                                      style={{ backgroundColor: attr.colorHex }}
                                    />
                                  )}
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {attr.value}
                                  </span>
                                </span>
                              ))}
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({groupImages.length}{' '}
                                {groupImages.length === 1
                                  ? t('image')
                                  : t('images')}
                                )
                              </span>
                            </div>
                            {/* Stock indicator */}
                            <span className={`text-sm px-2 py-1 rounded ${
                              group.totalStock > 0
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400'
                            }`}>
                              {group.totalStock > 0
                                ? `${t('stock')}: ${group.totalStock}`
                                : t('outOfStock')}
                            </span>
                          </div>

                          {/* Images Grid */}
                          <div className="flex flex-wrap gap-3 mb-4">
                            {groupImages.map((img, idx) => (
                              <div
                                key={idx}
                                className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700"
                              >
                                <Image
                                  src={img.url}
                                  alt={`${group.label} ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                  unoptimized={img.isPreview}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeImage(
                                      group.key,
                                      img.index,
                                      img.isPreview,
                                    )
                                  }
                                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
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
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                                {img.isPreview && (
                                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-yellow-500 text-white text-xs rounded">
                                    {t('new')}
                                  </span>
                                )}
                              </div>
                            ))}

                            {/* Add Image Button */}
                            <button
                              type="button"
                              onClick={() =>
                                fileInputRefs.current.get(group.key)?.click()
                              }
                              className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-lg hover:border-[var(--accent-500)] transition-colors flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-[var(--accent-600)]"
                            >
                              <svg
                                className="w-8 h-8 mb-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                              <span className="text-xs">{t('addImage')}</span>
                            </button>
                            <input
                              type="file"
                              ref={(el) => {
                                fileInputRefs.current.set(group.key, el);
                              }}
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) =>
                                handleImageUpload(group.key, e.target.files)
                              }
                            />
                          </div>

                          {/* No images hint - only warn for in-stock variants */}
                          {groupImages.length === 0 && group.totalStock > 0 && (
                            <p className="text-sm text-yellow-600 dark:text-yellow-500">
                              ⚠️ {t('variantImageRequired')}
                            </p>
                          )}
                          {groupImages.length === 0 && group.totalStock === 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t('imagesOptionalOutOfStock')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
