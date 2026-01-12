'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';
import { getLatinInitial } from '../../../../lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

const BRAND_COLORS = [
  { name: 'indigo', hex: '#6366f1' },
  { name: 'rose', hex: '#f43f5e' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'green', hex: '#22c55e' },
  { name: 'purple', hex: '#a855f7' },
  { name: 'orange', hex: '#f97316' },
  { name: 'teal', hex: '#14b8a6' },
  { name: 'pink', hex: '#ec4899' },
];

interface StoreData {
  _id: string;
  subdomain: string;
  subdomainChangeCount?: number;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  description?: string;
  descriptionLocalized?: { ka?: string; en?: string };
  aboutUs?: string;
  aboutUsLocalized?: { ka?: string; en?: string };
  authorName?: string;
  authorNameLocalized?: { ka?: string; en?: string };
  brandColor: string;
  logo?: string;
  coverImage?: string;
  useInitialAsLogo: boolean;
  useDefaultCover: boolean;
  showAuthorName: boolean;
  phone?: string;
  email?: string;
  address?: string;
  hideAddress?: boolean;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  homepageProductOrder?: string;
}

const PRODUCT_ORDER_OPTIONS = [
  {
    value: 'popular',
    label: 'Most Popular (with variety)',
    description:
      'Shows most viewed products with slight randomness for variety',
  },
  {
    value: 'newest',
    label: 'Newest First',
    description: 'Shows your most recently added products',
  },
  {
    value: 'price_asc',
    label: 'Price: Low to High',
    description: 'Shows cheapest products first',
  },
  {
    value: 'price_desc',
    label: 'Price: High to Low',
    description: 'Shows most expensive products first',
  },
  {
    value: 'random',
    label: 'Random',
    description: 'Shows random products each time',
  },
];

export default function StoreSettingsPage() {
  const t = useTranslations('dashboard');
  const { refreshAuth } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<StoreData | null>(null);

  // File states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Subdomain change state
  const [newSubdomain, setNewSubdomain] = useState('');
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [isChangingSubdomain, setIsChangingSubdomain] = useState(false);
  const [showSubdomainConfirm, setShowSubdomainConfirm] = useState(false);
  const subdomainCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Calculate subdomain change cost
  const isFreeSubdomainChange = (formData?.subdomainChangeCount || 0) === 0;
  const subdomainChangeCost = isFreeSubdomainChange ? 0 : 10;

  // Check subdomain availability with debounce
  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      setSubdomainError(subdomain.length > 0 ? 'Subdomain must be at least 3 characters' : null);
      return;
    }

    if (subdomain === formData?.subdomain) {
      setSubdomainAvailable(null);
      setSubdomainError('This is your current subdomain');
      return;
    }

    setIsCheckingSubdomain(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/stores/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`,
        { credentials: 'include' }
      );
      const data = await response.json();
      setSubdomainAvailable(data.available);
      setSubdomainError(data.available ? null : data.error);
    } catch (err) {
      setSubdomainError('Failed to check availability');
      setSubdomainAvailable(null);
    } finally {
      setIsCheckingSubdomain(false);
    }
  };

  const handleSubdomainInputChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setNewSubdomain(normalized);
    setSubdomainAvailable(null);
    setSubdomainError(null);

    // Debounce the availability check
    if (subdomainCheckTimeout.current) {
      clearTimeout(subdomainCheckTimeout.current);
    }
    subdomainCheckTimeout.current = setTimeout(() => {
      checkSubdomainAvailability(normalized);
    }, 500);
  };

  const handleSubdomainChange = async () => {
    if (!newSubdomain || !subdomainAvailable || !formData) return;

    setIsChangingSubdomain(true);
    try {
      if (isFreeSubdomainChange) {
        // Free change - direct API call
        const response = await fetch(`${API_URL}/api/v1/stores/change-subdomain-free`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newSubdomain }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to change subdomain');
        }

        // Update form data with new subdomain
        setFormData((prev) => prev ? {
          ...prev,
          subdomain: data.newSubdomain,
          subdomainChangeCount: 1,
        } : null);

        setNewSubdomain('');
        setSubdomainAvailable(null);
        setShowSubdomainConfirm(false);
        setSuccess(data.message);

        // Refresh auth to update store in context
        await refreshAuth();
      } else {
        // Paid change - initiate payment flow
        const currentUrl = window.location.href.split('?')[0];
        const response = await fetch(`${API_URL}/api/v1/payments/subdomain-change`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            storeId: formData._id,
            newSubdomain,
            successUrl: `${currentUrl}?subdomain_changed=true&new_subdomain=${encodeURIComponent(newSubdomain)}`,
            failUrl: `${currentUrl}?subdomain_change_failed=true`,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to initiate payment');
        }

        // Redirect to BOG payment page
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change subdomain');
      setShowSubdomainConfirm(false);
    } finally {
      setIsChangingSubdomain(false);
    }
  };

  // Fetch store data
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/stores/my-store`, {
          credentials: 'include',
        });

        if (response.status === 404) {
          // User doesn't have a store yet
          setError('no-store');
          setIsLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch store data');
        }

        const data = await response.json();
        setFormData(data);
        setLogoPreview(data.logo || null);
        setCoverPreview(data.coverImage || null);
      } catch (err) {
        setError('Failed to load store data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStore();
  }, []);

  // Handle return from subdomain change payment
  useEffect(() => {
    const subdomainChanged = searchParams.get('subdomain_changed');
    const subdomainChangeFailed = searchParams.get('subdomain_change_failed');
    const newSubdomainParam = searchParams.get('new_subdomain');

    if (subdomainChanged === 'true') {
      setSuccess(
        newSubdomainParam
          ? `Subdomain successfully changed to ${newSubdomainParam}!`
          : 'Subdomain successfully changed!'
      );
      // Clean up URL
      router.replace(window.location.pathname, { scroll: false });
      // Refresh store data
      refreshAuth();
    } else if (subdomainChangeFailed === 'true') {
      setError('Subdomain change payment failed. Please try again.');
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [searchParams, router, refreshAuth]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (
        !['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(
          file.type,
        )
      ) {
        setError('Invalid file type. Please use JPG, PNG, SVG, or WebP.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file is too large. Maximum size is 2MB.');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setFormData((prev) =>
        prev ? { ...prev, useInitialAsLogo: false } : null,
      );
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Invalid file type. Please use JPG, PNG, or WebP.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Cover file is too large. Maximum size is 10MB.');
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      setFormData((prev) =>
        prev ? { ...prev, useDefaultCover: false } : null,
      );
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData((prev) =>
      prev ? { ...prev, logo: undefined, useInitialAsLogo: true } : null,
    );
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setFormData((prev) =>
      prev ? { ...prev, coverImage: undefined, useDefaultCover: true } : null,
    );
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => {
      if (!prev) return null;
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      }
      // Handle nested fields like socialLinks.facebook
      const [parent, child] = keys;
      return {
        ...prev,
        [parent]: {
          ...((prev[parent as keyof StoreData] as Record<string, unknown>) ||
            {}),
          [child]: value,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const submitData = new FormData();

      // Add text fields
      submitData.append('name', formData.nameLocalized?.en || formData.name);
      submitData.append('nameKa', formData.nameLocalized?.ka || '');
      submitData.append('nameEn', formData.nameLocalized?.en || formData.name);
      submitData.append(
        'description',
        formData.descriptionLocalized?.en || formData.description || '',
      );
      submitData.append(
        'descriptionKa',
        formData.descriptionLocalized?.ka || '',
      );
      submitData.append(
        'descriptionEn',
        formData.descriptionLocalized?.en || formData.description || '',
      );
      submitData.append(
        'aboutUs',
        formData.aboutUsLocalized?.en || formData.aboutUs || '',
      );
      submitData.append('aboutUsKa', formData.aboutUsLocalized?.ka || '');
      submitData.append(
        'aboutUsEn',
        formData.aboutUsLocalized?.en || formData.aboutUs || '',
      );
      submitData.append(
        'authorName',
        formData.authorNameLocalized?.en || formData.authorName || '',
      );
      submitData.append('authorNameKa', formData.authorNameLocalized?.ka || '');
      submitData.append(
        'authorNameEn',
        formData.authorNameLocalized?.en || formData.authorName || '',
      );
      submitData.append('brandColor', formData.brandColor);
      submitData.append('useInitialAsLogo', String(formData.useInitialAsLogo));
      submitData.append('useDefaultCover', String(formData.useDefaultCover));
      submitData.append('showAuthorName', String(formData.showAuthorName));
      submitData.append('phone', formData.phone || '');
      submitData.append('email', formData.email || '');
      submitData.append('address', formData.address || '');
      submitData.append('hideAddress', String(formData.hideAddress || false));

      // Social links
      if (formData.socialLinks) {
        submitData.append('socialLinks', JSON.stringify(formData.socialLinks));
      }

      // Homepage product order
      if (formData.homepageProductOrder) {
        submitData.append(
          'homepageProductOrder',
          formData.homepageProductOrder,
        );
      }

      // Files
      if (logoFile) {
        submitData.append('logoFile', logoFile);
      }
      if (coverFile) {
        submitData.append('coverFile', coverFile);
      }

      const response = await fetch(`${API_URL}/api/v1/stores/my-store`, {
        method: 'PATCH',
        body: submitData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update store');
      }

      const updatedStore = await response.json();
      setFormData(updatedStore);
      setLogoFile(null);
      setCoverFile(null);
      setSuccess('Store settings saved successfully!');

      // Refresh auth to update store in context
      await refreshAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2 mb-8" />
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 h-96" />
        </div>
      </div>
    );
  }

  if (error === 'no-store') {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            {t('storeSettings')}
          </h1>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Store Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don&apos;t have a store yet. Create one to start selling!
          </p>
          <a
            href="/register"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            Create Your Store
          </a>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">
            Failed to load store data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const accentColor =
    BRAND_COLORS.find((c) => c.name === formData.brandColor)?.hex || '#6366f1';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
          {t('storeSettings')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your store branding, description, and settings.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Logo & Cover Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Branding
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Store Logo
              </label>
              <div className="flex items-start gap-4">
                <div className="relative">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200 dark:border-zinc-700"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 rounded-xl flex items-center justify-center text-white text-3xl font-bold"
                      style={{ backgroundColor: accentColor }}
                    >
                      {getLatinInitial(formData.name)}
                    </div>
                  )}
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-block px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition text-sm font-medium"
                  >
                    Upload Logo
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    JPG, PNG, SVG, or WebP. Max 2MB.
                  </p>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useInitialAsLogo}
                      onChange={(e) =>
                        updateField('useInitialAsLogo', e.target.checked)
                      }
                      className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600"
                      style={{ accentColor: 'var(--accent-500)' }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      Use initial as logo
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Cover Image
              </label>
              <div className="relative">
                {coverPreview && !formData.useDefaultCover ? (
                  <div className="relative">
                    <img
                      src={coverPreview}
                      alt="Cover"
                      className="w-full h-32 rounded-xl object-cover border-2 border-gray-200 dark:border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-full h-32 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`,
                    }}
                  />
                )}
              </div>
              <div className="mt-3 flex items-center gap-4">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverChange}
                  className="hidden"
                  id="cover-upload"
                />
                <label
                  htmlFor="cover-upload"
                  className="inline-block px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition text-sm font-medium"
                >
                  Upload Cover
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useDefaultCover}
                    onChange={(e) =>
                      updateField('useDefaultCover', e.target.checked)
                    }
                    className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600"
                    style={{ accentColor: 'var(--accent-500)' }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    Use colored background
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                JPG, PNG, or WebP. Recommended: 1200×400px. Max 10MB.
              </p>
            </div>
          </div>

          {/* Brand Color */}
          <div className="mt-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Brand Color
            </label>
            <div className="flex flex-wrap gap-3">
              {BRAND_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => updateField('brandColor', color.name)}
                  className={`w-10 h-10 rounded-xl transition-all ${
                    formData.brandColor === color.name
                      ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bilingual Store Information */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Store Information
          </h2>

          {/* Store Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Store Name
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    🇬🇪 Georgian
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.nameLocalized?.ka || ''}
                  onChange={(e) =>
                    updateField('nameLocalized', {
                      ...formData.nameLocalized,
                      ka: e.target.value,
                    })
                  }
                  placeholder="მაღაზიის სახელი"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    🇬🇧 English
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.nameLocalized?.en || formData.name}
                  onChange={(e) =>
                    updateField('nameLocalized', {
                      ...formData.nameLocalized,
                      en: e.target.value,
                    })
                  }
                  placeholder="Store Name"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Store Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Description
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    🇬🇪 Georgian
                  </span>
                </div>
                <textarea
                  value={formData.descriptionLocalized?.ka || ''}
                  onChange={(e) =>
                    updateField('descriptionLocalized', {
                      ...formData.descriptionLocalized,
                      ka: e.target.value,
                    })
                  }
                  placeholder="მაღაზიის აღწერა..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    🇬🇧 English
                  </span>
                </div>
                <textarea
                  value={
                    formData.descriptionLocalized?.en ||
                    formData.description ||
                    ''
                  }
                  onChange={(e) =>
                    updateField('descriptionLocalized', {
                      ...formData.descriptionLocalized,
                      en: e.target.value,
                    })
                  }
                  placeholder="Store description..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* About Us */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              About Us
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 font-normal">
                (Shown on your About page)
              </span>
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    🇬🇪 Georgian
                  </span>
                </div>
                <textarea
                  value={formData.aboutUsLocalized?.ka || ''}
                  onChange={(e) =>
                    updateField('aboutUsLocalized', {
                      ...formData.aboutUsLocalized,
                      ka: e.target.value,
                    })
                  }
                  placeholder="თქვენს შესახებ დეტალური ინფორმაცია..."
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    🇬🇧 English
                  </span>
                </div>
                <textarea
                  value={
                    formData.aboutUsLocalized?.en ||
                    formData.aboutUs ||
                    ''
                  }
                  onChange={(e) =>
                    updateField('aboutUsLocalized', {
                      ...formData.aboutUsLocalized,
                      en: e.target.value,
                    })
                  }
                  placeholder="Detailed information about your store..."
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Tell your customers more about your brand, story, mission, and what makes you unique.
            </p>
          </div>

          {/* Author Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Author / Owner Name
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    🇬🇪 Georgian
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.authorNameLocalized?.ka || ''}
                  onChange={(e) =>
                    updateField('authorNameLocalized', {
                      ...formData.authorNameLocalized,
                      ka: e.target.value,
                    })
                  }
                  placeholder="ავტორის სახელი"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    🇬🇧 English
                  </span>
                </div>
                <input
                  type="text"
                  value={
                    formData.authorNameLocalized?.en ||
                    formData.authorName ||
                    ''
                  }
                  onChange={(e) =>
                    updateField('authorNameLocalized', {
                      ...formData.authorNameLocalized,
                      en: e.target.value,
                    })
                  }
                  placeholder="Author Name"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showAuthorName}
                onChange={(e) =>
                  updateField('showAuthorName', e.target.checked)
                }
                className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600"
                style={{ accentColor: 'var(--accent-500)' }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">
                Show author name on store homepage
              </span>
            </label>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Contact Information
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This information will be visible to your customers on your store
            page.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+995 555 123 456"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="contact@yourstore.com"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="123 Main St, Tbilisi, Georgia"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="mt-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="hideAddress"
                  checked={formData.hideAddress || false}
                  onChange={(e) => updateField('hideAddress', e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="hideAddress"
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  <span className="font-medium">Hide address from customers</span>
                  <br />
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    Your address is still required for courier pickup, but won&apos;t
                    be shown on your public store page.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Social Media Links
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Facebook
              </label>
              <input
                type="url"
                value={formData.socialLinks?.facebook || ''}
                onChange={(e) =>
                  updateField('socialLinks.facebook', e.target.value)
                }
                placeholder="https://facebook.com/yourpage"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instagram
              </label>
              <input
                type="url"
                value={formData.socialLinks?.instagram || ''}
                onChange={(e) =>
                  updateField('socialLinks.instagram', e.target.value)
                }
                placeholder="https://instagram.com/yourprofile"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                TikTok
              </label>
              <input
                type="url"
                value={formData.socialLinks?.tiktok || ''}
                onChange={(e) =>
                  updateField('socialLinks.tiktok', e.target.value)
                }
                placeholder="https://tiktok.com/@yourprofile"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Twitter / X
              </label>
              <input
                type="url"
                value={formData.socialLinks?.twitter || ''}
                onChange={(e) =>
                  updateField('socialLinks.twitter', e.target.value)
                }
                placeholder="https://twitter.com/yourprofile"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Homepage Product Order */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Homepage Product Display
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Choose how products appear on your store&apos;s homepage (up to 6
            products will be shown)
          </p>

          <div className="space-y-3">
            {PRODUCT_ORDER_OPTIONS.map((option) => {
              const isSelected = formData.homepageProductOrder === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[var(--accent-500)] bg-white dark:bg-zinc-800'
                      : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 bg-gray-50 dark:bg-zinc-900'
                  }`}
                >
                  <input
                    type="radio"
                    name="homepageProductOrder"
                    value={option.value}
                    checked={isSelected}
                    onChange={(e) =>
                      updateField('homepageProductOrder', e.target.value)
                    }
                    className="mt-1"
                    style={{ accentColor: 'var(--accent-500)' }}
                  />
                  <div>
                    <span
                      className={`font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                      {option.label}
                    </span>
                    <p
                      className={`text-sm mt-0.5 ${isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      {option.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Store URL & Subdomain Change */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Store URL
          </h2>
          
          {/* Current URL */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
              <span className="text-gray-500 dark:text-gray-400">https://</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formData.subdomain}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                .shopit.ge
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `https://${formData.subdomain}.shopit.ge`,
                );
                setSuccess('Store URL copied to clipboard!');
                setTimeout(() => setSuccess(null), 3000);
              }}
              className="px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition font-medium"
            >
              Copy
            </button>
          </div>

          {/* Subdomain Change Section */}
          <div className="border-t border-gray-200 dark:border-zinc-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Change Subdomain
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isFreeSubdomainChange ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ✨ Your first change is free!
                    </span>
                  ) : (
                    <span>
                      Changing your subdomain costs <span className="font-semibold text-gray-900 dark:text-white">₾{subdomainChangeCost}</span>
                    </span>
                  )}
                </p>
              </div>
              {(formData.subdomainChangeCount || 0) > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Changed {formData.subdomainChangeCount} time{(formData.subdomainChangeCount || 0) > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* New Subdomain Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="flex items-center border border-gray-300 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
                  <span className="px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 text-sm border-r border-gray-300 dark:border-zinc-700">
                    https://
                  </span>
                  <input
                    type="text"
                    value={newSubdomain}
                    onChange={(e) => handleSubdomainInputChange(e.target.value)}
                    placeholder="new-subdomain"
                    maxLength={30}
                    className="flex-1 px-3 py-2.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none"
                  />
                  <span className="px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 text-sm border-l border-gray-300 dark:border-zinc-700">
                    .shopit.ge
                  </span>
                </div>
                
                {/* Status Messages */}
                <div className="mt-2 min-h-[20px]">
                  {isCheckingSubdomain && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Checking availability...
                    </p>
                  )}
                  {!isCheckingSubdomain && subdomainError && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      ✕ {subdomainError}
                    </p>
                  )}
                  {!isCheckingSubdomain && subdomainAvailable && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ This subdomain is available!
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSubdomainConfirm(true)}
                disabled={!subdomainAvailable || isCheckingSubdomain}
                className="h-[42px] px-6 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                style={{ backgroundColor: subdomainAvailable ? accentColor : undefined }}
              >
                Change
              </button>
            </div>
          </div>
        </div>

        {/* Subdomain Change Confirmation Modal */}
        {showSubdomainConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Confirm Subdomain Change
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formData.subdomain}.shopit.ge
                  </span>
                </div>
                <div className="flex justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <span className="text-sm text-indigo-600 dark:text-indigo-400">New</span>
                  <span className="font-medium text-indigo-700 dark:text-indigo-300">
                    {newSubdomain}.shopit.ge
                  </span>
                </div>

                {!isFreeSubdomainChange && (
                  <div className="flex items-center justify-between py-3 px-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-sm text-amber-700 dark:text-amber-400">Cost</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      ₾{subdomainChangeCost}
                    </span>
                  </div>
                )}

                {isFreeSubdomainChange && (
                  <div className="text-center py-2 px-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                      ✨ This change is free! Future changes will cost ₾10.
                    </span>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                <p className="mb-1">⚠️ <strong>Important:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Your old URL will stop working immediately</li>
                  <li>Existing links and bookmarks will break</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubdomainConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubdomainChange}
                  disabled={isChangingSubdomain}
                  className="flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ backgroundColor: accentColor }}
                >
                  {isChangingSubdomain ? 'Changing...' : isFreeSubdomainChange ? 'Confirm Change' : `Pay ₾${subdomainChangeCost} & Change`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: accentColor }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
