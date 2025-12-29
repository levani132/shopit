'use client';

import { useState, useEffect, useRef } from 'react';
import { useRegistration } from '../RegistrationContext';
import { useTranslations } from 'next-intl';

const BRAND_COLORS: Record<string, string> = {
  indigo: '#6366f1',
  rose: '#f43f5e',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  black: '#18181b',
};

export function Step2Details() {
  const t = useTranslations('register');
  const {
    data,
    updateData,
    nextStep,
    prevStep,
    setUnblurredSections,
    setShowMobileCta,
  } = useRegistration();
  const [errors, setErrors] = useState<{
    description?: string;
    authorName?: string;
  }>({});
  const [animating, setAnimating] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const accentColor = BRAND_COLORS[data.brandColor] || BRAND_COLORS.indigo;

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return;
      }
      // Validate file size (10MB max for covers)
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      updateData({
        coverFile: file,
        coverPreview: previewUrl,
        useDefaultCover: false,
      });
    }
  };

  const handleRemoveCover = () => {
    if (data.coverPreview) {
      URL.revokeObjectURL(data.coverPreview);
    }
    updateData({
      coverFile: null,
      coverPreview: null,
      useDefaultCover: true,
    });
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  };

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimating(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleBack = () => {
    // Re-blur header when going back to step 1
    setUnblurredSections([]);
    prevStep();
  };

  const handleSubmit = () => {
    const newErrors: typeof errors = {};

    if (!data.description.trim()) {
      newErrors.description = t('descriptionRequired');
    }
    if (!data.authorName.trim()) {
      newErrors.authorName = t('authorNameRequired');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (isMobile) {
      // On mobile, show the CTA overlay instead of going directly to step 3
      // Unblur header + hero so user can see their store preview
      setUnblurredSections(['header', 'hero']);
      setShowMobileCta(true);
    } else {
      // On desktop, go to step 3 directly
      nextStep();
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 pt-20">
      {/* Step indicator - Outside paper */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: accentColor }}
          >
            ✓
          </div>
          <div className="w-8 h-0.5" style={{ backgroundColor: accentColor }} />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: accentColor }}
          >
            2
          </div>
          <div className="w-8 h-0.5 bg-white/30" />
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 text-white/60 font-bold text-sm">
            3
          </div>
        </div>
      </div>

      {/* Main Form Card - Compact */}
      <div
        className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm transition-all duration-500 ${
          animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-1">
          {t('describeYourStore')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-5">
          {t('step2Description')}
        </p>

        {/* Store Description */}
        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {t('storeDescription')} *
          </label>
          <textarea
            id="description"
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder={t('enterDescription')}
            rows={3}
            maxLength={300}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none text-sm"
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            {data.description.length}/300
          </p>
        </div>

        {/* Author Name */}
        <div className="mb-4">
          <label
            htmlFor="authorName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {t('authorName')} *
          </label>
          <input
            id="authorName"
            type="text"
            value={data.authorName}
            onChange={(e) => updateData({ authorName: e.target.value })}
            placeholder={t('enterAuthorName')}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
          />
          {errors.authorName && (
            <p className="text-red-500 text-xs mt-1">{errors.authorName}</p>
          )}
        </div>

        {/* Show Author Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.showAuthorName}
              onChange={(e) => updateData({ showAuthorName: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('showAuthorOnHomepage')}
            </span>
          </label>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 ml-6">
            {t('authorVisibilityNote')}
          </p>
        </div>

        {/* Cover Image Section */}
        <div className="mb-5 pt-4 border-t border-gray-200 dark:border-zinc-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('coverImage')}
          </label>

          {/* Use Default Cover Toggle */}
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={data.useDefaultCover}
              onChange={(e) => {
                updateData({ useDefaultCover: e.target.checked });
                if (e.target.checked) {
                  handleRemoveCover();
                }
              }}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('useDefaultCover')}
            </span>
          </label>

          {/* Warning when using default cover */}
          {data.useDefaultCover && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
              <div className="flex gap-2">
                <svg
                  className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t('defaultCoverWarning')}
                </p>
              </div>
            </div>
          )}

          {/* Cover Upload (hidden when using default) */}
          {!data.useDefaultCover && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverChange}
                className="hidden"
                id="cover-upload"
              />

              {data.coverPreview ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={data.coverPreview}
                    alt="Cover preview"
                    className="w-full h-24 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <svg
                      className="w-3 h-3"
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
                </div>
              ) : (
                <label
                  htmlFor="cover-upload"
                  className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-zinc-500 transition"
                >
                  <svg
                    className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('uploadCover')}
                  </span>
                </label>
              )}
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5">
                {t('coverFormatHint')}
              </p>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition text-sm"
          >
            {t('back')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-2.5 px-4 text-white font-semibold rounded-lg transition-colors text-sm"
            style={{ backgroundColor: accentColor }}
          >
            {t('continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
