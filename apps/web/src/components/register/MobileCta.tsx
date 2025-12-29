'use client';

import { useRegistration } from './RegistrationContext';
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

export function MobileCta() {
  const t = useTranslations('register');
  const { data, setShowMobileCta, nextStep, prevStep, setUnblurredSections } =
    useRegistration();

  const accentColor = BRAND_COLORS[data.brandColor] || BRAND_COLORS.indigo;

  const handleContinue = () => {
    // Hide the CTA overlay
    setShowMobileCta(false);
    // Blur everything for step 3
    setUnblurredSections([]);
    // Go to step 3
    nextStep();
  };

  const handleGoBack = () => {
    // Hide the CTA overlay
    setShowMobileCta(false);
    // Re-blur to header only (step 2 state)
    setUnblurredSections(['header']);
    // Go back to step 2
    prevStep();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Gradient fade effect at top */}
      <div className="h-8 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent" />

      {/* CTA Container */}
      <div className="bg-white dark:bg-zinc-900 px-4 pb-6 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-4">
          {t('mobileCtaText')}{' '}
          <button
            onClick={handleGoBack}
            className="underline text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t('orGoBack')}
          </button>
        </p>

        <button
          onClick={handleContinue}
          className="w-full py-3.5 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          style={{ backgroundColor: accentColor }}
        >
          {t('continue')}
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
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

