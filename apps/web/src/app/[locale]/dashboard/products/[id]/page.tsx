'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  isActive: boolean;
  stock: string;
  categoryId: string;
  subcategoryId: string;
}

export default function EditProductPage() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
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
    isActive: true,
    stock: '',
    categoryId: '',
    subcategoryId: '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  // Existing images from the server (URLs)
  const [existingImages, setExistingImages] = useState<string[]>([]);
  // New images to upload (File objects)
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Fetch product and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch product and categories in parallel
        const [productRes, categoriesRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/products/${productId}`, {
            credentials: 'include',
          }),
          fetch(`${API_URL}/api/v1/categories/my-store`, {
            credentials: 'include',
          }),
        ]);

        if (!productRes.ok) {
          throw new Error('Product not found');
        }

        const product = await productRes.json();

        // Populate form with product data
        setFormData({
          name: product.name || '',
          nameKa: product.nameLocalized?.ka || '',
          nameEn: product.nameLocalized?.en || product.name || '',
          description: product.description || '',
          descriptionKa: product.descriptionLocalized?.ka || '',
          descriptionEn: product.descriptionLocalized?.en || product.description || '',
          price: String(product.price || ''),
          salePrice: product.salePrice ? String(product.salePrice) : '',
          isOnSale: product.isOnSale || false,
          isActive: product.isActive !== false,
          stock: String(product.stock || 0),
          categoryId: product.categoryId?._id || product.categoryId || '',
          subcategoryId: product.subcategoryId?._id || product.subcategoryId || '',
        });

        // Set existing images
        setExistingImages(product.images || []);

        // Set variant data
        setHasVariants(product.hasVariants || false);
        setProductAttributes(
          (product.productAttributes || []).map((pa: { attributeId: string | { _id: string }; selectedValues: (string | { _id: string })[] }) => ({
            attributeId: typeof pa.attributeId === 'string' ? pa.attributeId : pa.attributeId?._id,
            selectedValues: (pa.selectedValues || []).map((v: string | { _id: string }) =>
              typeof v === 'string' ? v : v?._id,
            ),
          })),
        );
        setVariants(
          (product.variants || []).map((v: {
            _id?: string | { toString: () => string };
            sku?: string;
            attributes?: {
              attributeId: string | { _id: string; toString: () => string };
              attributeName: string;
              valueId: string | { _id: string; toString: () => string };
              value: string;
              colorHex?: string;
            }[];
            price?: number;
            salePrice?: number;
            stock?: number;
            images?: string[];
            isActive?: boolean;
          }) => ({
            _id: typeof v._id === 'string' ? v._id : v._id?.toString(),
            sku: v.sku,
            attributes: (v.attributes || []).map((attr) => ({
              attributeId:
                typeof attr.attributeId === 'string'
                  ? attr.attributeId
                  : attr.attributeId?.toString(),
              attributeName: attr.attributeName,
              valueId:
                typeof attr.valueId === 'string'
                  ? attr.valueId
                  : attr.valueId?.toString(),
              value: attr.value,
              colorHex: attr.colorHex,
            })),
            price: v.price,
            salePrice: v.salePrice,
            stock: v.stock ?? 0,
            images: v.images || [],
            isActive: v.isActive !== false,
          })),
        );

        // Set categories
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId]);

  // Handle new image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + newImages.length + files.length;

    if (totalImages > 10) {
      setError('You can have a maximum of 10 images');
      return;
    }

    setNewImages([...newImages, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove existing image
  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  // Remove new image
  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index));
    setNewImagePreviews(newImagePreviews.filter((_, i) => i !== index));
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
      formDataToSend.append('isActive', String(formData.isActive));
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

      // Add existing images as JSON (for backend to keep track)
      formDataToSend.append('existingImages', JSON.stringify(existingImages));

      // Add new images
      newImages.forEach((image) => {
        formDataToSend.append('images', image);
      });

      const res = await fetch(`${API_URL}/api/v1/products/${productId}`, {
        method: 'PATCH',
        credentials: 'include',
        body: formDataToSend,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update product');
      }

      // Success - redirect to products list
      router.push('/dashboard/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete product');
      }

      router.push('/dashboard/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get subcategories for selected category
  const selectedCategory = categories.find((c) => c._id === formData.categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  // Total images count
  const totalImages = existingImages.length + newImages.length;

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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
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
              {t('editProduct')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('updateProduct')}
            </p>
          </div>
        </div>

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {t('delete')}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('deleteProduct')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('deleteProductConfirm')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('deleting')}
                  </>
                ) : (
                  t('deleteProduct')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Status Toggle */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('productStatus')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {formData.isActive ? t('productVisible') : t('productHidden')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600"
                style={{
                  backgroundColor: formData.isActive ? 'var(--accent-500)' : undefined,
                }}
              />
            </label>
          </div>
        </div>

        {/* Images Section */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('productImages')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('productImagesDescription')}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {/* Existing images */}
            {existingImages.map((url, index) => (
              <div key={`existing-${index}`} className="relative aspect-square group">
                <img
                  src={url}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {index === 0 && newImages.length === 0 && (
                  <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                    {t('main')}
                  </span>
                )}
              </div>
            ))}

            {/* New image previews */}
            {newImagePreviews.map((preview, index) => (
              <div key={`new-${index}`} className="relative aspect-square group">
                <img
                  src={preview}
                  alt={`New ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border-2 border-dashed"
                  style={{ borderColor: 'var(--accent-500)' }}
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {index === 0 && existingImages.length === 0 && (
                  <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                    {t('main')}
                  </span>
                )}
                <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded text-white" style={{ backgroundColor: 'var(--accent-500)' }}>
                  {t('new')}
                </span>
              </div>
            ))}

            {/* Add image button */}
            {totalImages < 10 && (
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
                {t('saveChanges')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

