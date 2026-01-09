'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '../../../../../i18n/routing';
import VariantEditor from '../../../../../components/dashboard/VariantEditor';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface Category {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  subcategories: {
    _id: string;
    name: string;
    nameLocalized?: { ka?: string; en?: string };
  }[];
}

interface ProductFormData {
  name: string;
  nameKa: string;
  nameEn: string;
  description: string;
  descriptionKa: string;
  descriptionEn: string;
  price: string;
  salePrice: string;
  isOnSale: boolean;
  stock: string;
  categoryId: string;
  subcategoryId: string;
}

export default function NewProductPage() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    nameKa: '',
    nameEn: '',
    description: '',
    descriptionKa: '',
    descriptionEn: '',
    price: '',
    salePrice: '',
    isOnSale: false,
    stock: '',
    categoryId: '',
    subcategoryId: '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Variant state
  const [hasVariants, setHasVariants] = useState(false);
  const [productAttributes, setProductAttributes] = useState<
    { attributeId: string; selectedValues: string[] }[]
  >([]);
  const [variants, setVariants] = useState<
    {
      _id?: string;
      sku?: string;
      attributes: {
        attributeId: string;
        attributeName: string;
        valueId: string;
        value: string;
        colorHex?: string;
      }[];
      price?: number;
      salePrice?: number;
      stock: number;
      images: string[];
      isActive: boolean;
    }[]
  >([]);
  const [variantImageFiles, setVariantImageFiles] = useState<Map<string, File[]>>(new Map());

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_URL}/api/v1/categories/my-store`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      setError('You can upload a maximum of 10 images');
      return;
    }

    setImages([...images, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const formDataToSend = new FormData();

      // Add text fields
      formDataToSend.append('name', formData.nameEn || formData.name);
      formDataToSend.append(
        'nameLocalized',
        JSON.stringify({
          ka: formData.nameKa,
          en: formData.nameEn || formData.name,
        })
      );

      if (formData.descriptionEn || formData.description) {
        formDataToSend.append('description', formData.descriptionEn || formData.description);
        formDataToSend.append(
          'descriptionLocalized',
          JSON.stringify({
            ka: formData.descriptionKa,
            en: formData.descriptionEn || formData.description,
          })
        );
      }

      formDataToSend.append('price', formData.price);

      if (formData.salePrice) {
        formDataToSend.append('salePrice', formData.salePrice);
      }

      formDataToSend.append('isOnSale', String(formData.isOnSale));
      formDataToSend.append('stock', formData.stock || '0');

      if (formData.categoryId) {
        formDataToSend.append('categoryId', formData.categoryId);
      }

      if (formData.subcategoryId) {
        formDataToSend.append('subcategoryId', formData.subcategoryId);
      }

      // Add variant data
      formDataToSend.append('hasVariants', String(hasVariants));

      if (hasVariants && productAttributes.length > 0) {
        formDataToSend.append(
          'productAttributes',
          JSON.stringify(productAttributes),
        );
      }

      if (hasVariants && variants.length > 0) {
        formDataToSend.append('variants', JSON.stringify(variants));
      }

      // Add main product images
      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      // Add variant images (grouped by key)
      if (hasVariants && variantImageFiles.size > 0) {
        // Include mapping of image group key -> number of files
        const variantImageMapping: Record<string, number> = {};
        variantImageFiles.forEach((files, key) => {
          variantImageMapping[key] = files.length;
          files.forEach((file) => {
            formDataToSend.append('variantImages', file);
          });
        });
        formDataToSend.append('variantImageMapping', JSON.stringify(variantImageMapping));
      }

      const res = await fetch(`${API_URL}/api/v1/products`, {
        method: 'POST',
        credentials: 'include',
        body: formDataToSend,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create product');
      }

      // Success - redirect to products list
      router.push('/dashboard/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSaving(false);
    }
  };

  // Get subcategories for selected category
  const selectedCategory = categories.find((c) => c._id === formData.categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 dark:bg-zinc-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/products"
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('addNewProduct')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('createNewProduct')}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Images Section */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('productImages')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('productImagesDescription')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {/* Image previews */}
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative aspect-square group">
                <img
                  src={preview}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                    {t('main')}
                  </span>
                )}
              </div>
            ))}

            {/* Add image button */}
            {images.length < 10 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-lg flex flex-col items-center justify-center hover:border-gray-400 dark:hover:border-zinc-500 transition-colors"
              >
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm text-gray-500 mt-2">{t('addImage')}</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        {/* Basic Info Section */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('basicInformation')}
          </h2>

          {/* Product Name */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('productNameGeorgian')}
              </label>
              <input
                type="text"
                value={formData.nameKa}
                onChange={(e) => setFormData({ ...formData, nameKa: e.target.value })}
                placeholder="პროდუქტის სახელი"
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('productNameEnglish')} *
              </label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="Product name"
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('descriptionGeorgian')}
              </label>
              <textarea
                value={formData.descriptionKa}
                onChange={(e) => setFormData({ ...formData, descriptionKa: e.target.value })}
                placeholder="პროდუქტის აღწერა"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('descriptionEnglish')}
              </label>
              <textarea
                value={formData.descriptionEn}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                placeholder="Product description"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('pricingInventory')}
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('price')} *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('salePrice')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                placeholder="0.00"
                disabled={!formData.isOnSale}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('stockQuantity')}
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOnSale}
                onChange={(e) => setFormData({ ...formData, isOnSale: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 dark:border-zinc-600"
                style={{ accentColor: 'var(--accent-500)' }}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {t('productOnSale')}
              </span>
            </label>
          </div>
        </div>

        {/* Category Section */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('category')}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('category')}
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('selectCategory')}</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.nameLocalized?.en || cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subcategory')}
              </label>
              <select
                value={formData.subcategoryId}
                onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                disabled={!formData.categoryId || subcategories.length === 0}
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">{t('selectSubcategory')}</option>
                {subcategories.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.nameLocalized?.en || sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {categories.length === 0 && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('noCategoriesYet')}{' '}
              <Link href="/dashboard/categories" className="text-[var(--accent-600)] hover:underline">
                {t('createCategories')}
              </Link>{' '}
              {t('toOrganizeProducts')}
            </p>
          )}
        </div>

        {/* Variants Section */}
        <VariantEditor
          hasVariants={hasVariants}
          productAttributes={productAttributes}
          variants={variants}
          onHasVariantsChange={setHasVariants}
          onProductAttributesChange={setProductAttributes}
          onVariantsChange={setVariants}
          variantImageFiles={variantImageFiles}
          onVariantImageFilesChange={setVariantImageFiles}
        />

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/products"
            className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {t('cancel')}
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent-500)' }}
          >
            {isSaving ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('saving')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('createProduct')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

