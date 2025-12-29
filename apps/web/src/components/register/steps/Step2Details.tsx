'use client';

import { useState, useEffect } from 'react';
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
  const { data, updateData, nextStep, prevStep, setUnblurredSections } = useRegistration();
  const [errors, setErrors] = useState<{ description?: string; authorName?: string }>({});
  const [animating, setAnimating] = useState(true);

  const accentColor = BRAND_COLORS[data.brandColor] || BRAND_COLORS.indigo;

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
    nextStep();
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
        <div className="mb-5">
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
