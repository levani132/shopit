'use client';

import { useRegistration } from './RegistrationContext';

// Accent color palettes
const ACCENT_COLORS: Record<string, Record<string, string>> = {
  indigo: {
    '400': '#818cf8',
    '500': '#6366f1',
    '600': '#4f46e5',
    '700': '#4338ca',
    '800': '#3730a3',
  },
  rose: {
    '400': '#fb7185',
    '500': '#f43f5e',
    '600': '#e11d48',
    '700': '#be123c',
    '800': '#9f1239',
  },
  blue: {
    '400': '#60a5fa',
    '500': '#3b82f6',
    '600': '#2563eb',
    '700': '#1d4ed8',
    '800': '#1e40af',
  },
  green: {
    '400': '#4ade80',
    '500': '#22c55e',
    '600': '#16a34a',
    '700': '#15803d',
    '800': '#166534',
  },
  purple: {
    '400': '#c084fc',
    '500': '#a855f7',
    '600': '#9333ea',
    '700': '#7e22ce',
    '800': '#6b21a8',
  },
  orange: {
    '400': '#fb923c',
    '500': '#f97316',
    '600': '#ea580c',
    '700': '#c2410c',
    '800': '#9a3412',
  },
  black: {
    '400': '#a1a1aa',
    '500': '#71717a',
    '600': '#52525b',
    '700': '#3f3f46',
    '800': '#27272a',
  },
};

export function BlurredStorePreview() {
  const { data, step, unblurredSections } = useRegistration();
  const colors = ACCENT_COLORS[data.brandColor] || ACCENT_COLORS.indigo;

  const isUnblurred = (section: string) =>
    unblurredSections.includes(section as (typeof unblurredSections)[number]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Dynamic gradient background based on brand color */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: `linear-gradient(135deg, ${colors['600']} 0%, ${colors['800']} 50%, #18181b 100%)`,
        }}
      />

      {/* Decorative elements */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl transition-colors duration-700"
        style={{ backgroundColor: colors['400'] }}
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-15 blur-3xl transition-colors duration-700"
        style={{ backgroundColor: colors['500'] }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl transition-colors duration-700"
        style={{ backgroundColor: colors['400'] }}
      />

      {/* Simulated store preview - only visible when step > 1 and header is unblurred */}
      {step >= 2 && (
        <>
          {/* Header section */}
          <div
            className={`absolute top-0 left-0 right-0 transition-all duration-700 ${
              isUnblurred('header')
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-4'
            }`}
          >
            <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm shadow-lg">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
                {/* Logo */}
                <div className="flex items-center gap-3">
                  {data.logoPreview && !data.useInitialAsLogo ? (
                    <img
                      src={data.logoPreview}
                      alt="Store logo"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors duration-500"
                      style={{ backgroundColor: colors['500'] }}
                    >
                      {(data.storeName || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-semibold text-gray-900 dark:text-white text-lg">
                    {data.storeName || 'Your Store'}
                  </span>
                </div>

                {/* Nav */}
                <nav className="hidden md:flex items-center gap-6 ml-10">
                  <span className="text-gray-600 dark:text-gray-300">Products</span>
                  <span className="text-gray-600 dark:text-gray-300">Categories</span>
                  <span className="text-gray-600 dark:text-gray-300">About</span>
                </nav>

                {/* Cart */}
                <div className="ml-auto">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero section */}
          {isUnblurred('hero') && (
            <div
              className="absolute left-0 right-0 transition-all duration-700"
              style={{ top: '64px' }}
            >
              <div
                className="py-16 transition-colors duration-500"
                style={{
                  background: `linear-gradient(135deg, ${colors['500']} 0%, ${colors['700']} 100%)`,
                }}
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    {data.storeName || 'Your Store Name'}
                  </h1>
                  <p className="text-lg text-white/90 mb-2 max-w-2xl mx-auto">
                    {data.description || 'Your store description will appear here...'}
                  </p>
                  {data.showAuthorName && data.authorName && (
                    <p className="text-white/70 text-sm">by {data.authorName}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating shapes for visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 right-[10%] w-4 h-4 rounded-full opacity-40 animate-pulse"
          style={{ backgroundColor: colors['400'] }}
        />
        <div
          className="absolute top-40 left-[15%] w-3 h-3 rounded-full opacity-30 animate-pulse"
          style={{ backgroundColor: colors['500'], animationDelay: '1s' }}
        />
        <div
          className="absolute bottom-32 right-[20%] w-5 h-5 rounded-full opacity-25 animate-pulse"
          style={{ backgroundColor: colors['400'], animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-48 left-[25%] w-3 h-3 rounded-full opacity-35 animate-pulse"
          style={{ backgroundColor: colors['500'], animationDelay: '0.5s' }}
        />
      </div>
    </div>
  );
}
