'use client';

import { useRef, useState } from 'react';
import { useRegistration } from '../RegistrationContext';
import { useTranslations } from 'next-intl';

const BRAND_COLORS = [
  { name: 'indigo', label: 'Indigo', color: '#6366f1' },
  { name: 'rose', label: 'Rose', color: '#f43f5e' },
  { name: 'blue', label: 'Blue', color: '#3b82f6' },
  { name: 'green', label: 'Green', color: '#22c55e' },
  { name: 'purple', label: 'Purple', color: '#a855f7' },
  { name: 'orange', label: 'Orange', color: '#f97316' },
  { name: 'black', label: 'Black', color: '#18181b' },
];

export function Step1Brand() {
  const t = useTranslations('register');
  const { data, updateData, nextStep, setIsPreviewAnimating, setUnblurredSections } = useRegistration();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const accentColor = BRAND_COLORS.find((c) => c.name === data.brandColor)?.color || '#6366f1';

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateData({
          logoFile: file,
          logoPreview: reader.result as string,
          useInitialAsLogo: false,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!data.storeName.trim()) {
      setError(t('storeNameRequired'));
      return;
    }
    setError(null);
    setIsTransitioning(true);
    
    // Start the preview flying animation AND unblur header at the same time
    setIsPreviewAnimating(true);
    setUnblurredSections(['header']);
    
    // Hide animated preview slightly BEFORE animation visually ends (creates seamless overlap)
    setTimeout(() => {
      setIsPreviewAnimating(false);
    }, 480);
    
    // Then go to next step
    setTimeout(() => {
      nextStep();
    }, 520);
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
      {/* Step indicator - Outside paper */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: accentColor }}
          >
            1
          </div>
          <div className="w-8 h-0.5 bg-white/30" />
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 text-white/60 font-bold text-sm">
            2
          </div>
          <div className="w-8 h-0.5 bg-white/30" />
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 text-white/60 font-bold text-sm">
            3
          </div>
        </div>
      </div>

      {/* Brand Preview - Outside paper, looks like header preview */}
      <div
        className={`w-full max-w-sm mb-4 px-4 py-3 rounded-xl backdrop-blur-sm flex items-center gap-3 transition-all duration-300 ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{ backgroundColor: `${accentColor}20` }}
      >
        {data.logoPreview && !data.useInitialAsLogo ? (
          <img
            src={data.logoPreview}
            alt="Logo preview"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors"
            style={{ backgroundColor: accentColor }}
          >
            {data.storeName.charAt(0).toUpperCase() || 'S'}
          </div>
        )}
        <span className="font-semibold text-white text-lg truncate">
          {data.storeName || t('yourStoreName')}
        </span>
      </div>

      {/* Main Form Card - Compact */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-1">
          {t('createYourBrand')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-5">
          {t('step1Description')}
        </p>

        {/* Store Name */}
        <div className="mb-4">
          <label
            htmlFor="storeName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {t('storeName')} *
          </label>
          <input
            id="storeName"
            type="text"
            value={data.storeName}
            onChange={(e) => updateData({ storeName: e.target.value })}
            placeholder={t('enterStoreName')}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        {/* Brand Color */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('brandColor')}
          </label>
          <div className="flex flex-wrap gap-2">
            {BRAND_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                onClick={() => updateData({ brandColor: color.name })}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                  data.brandColor === color.name
                    ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-zinc-900'
                    : ''
                }`}
                style={{ backgroundColor: color.color }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Logo Upload */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('brandLogo')}
          </label>

          {/* Use Initial Toggle */}
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.useInitialAsLogo}
              onChange={(e) => updateData({ useInitialAsLogo: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('useInitialAsLogo')}
            </span>
          </label>

          {data.useInitialAsLogo ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                💡 {t('logoWarning')}
              </p>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2.5 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg hover:border-gray-400 dark:hover:border-zinc-600 transition text-gray-600 dark:text-gray-400 text-sm"
              >
                {data.logoPreview ? t('changeLogo') : t('uploadLogo')}
              </button>
              
              {/* Logo format hint */}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                💡 {t('logoFormatHint')}
              </p>

              {data.logoPreview && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={data.logoPreview}
                    alt="Logo"
                    className="w-12 h-12 rounded-lg object-contain bg-gray-100 dark:bg-zinc-800 p-1"
                  />
                  <button
                    type="button"
                    onClick={() => updateData({ logoFile: null, logoPreview: null })}
                    className="text-red-500 text-xs hover:underline"
                  >
                    {t('remove')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-2.5 px-6 text-white font-semibold rounded-lg transition-colors text-sm"
          style={{ backgroundColor: accentColor }}
        >
          {t('continue')}
        </button>
      </div>
    </div>
  );
}
