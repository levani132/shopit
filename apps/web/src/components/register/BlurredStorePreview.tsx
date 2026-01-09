'use client';

import { useRegistration } from './RegistrationContext';

// Accent color palettes matching the store layout
const ACCENT_COLORS: Record<string, Record<string, string>> = {
  indigo: {
    '50': '#eef2ff',
    '100': '#e0e7ff',
    '200': '#c7d2fe',
    '300': '#a5b4fc',
    '400': '#818cf8',
    '500': '#6366f1',
    '600': '#4f46e5',
    '700': '#4338ca',
    '800': '#3730a3',
    '900': '#312e81',
  },
  rose: {
    '50': '#fff1f2',
    '100': '#ffe4e6',
    '200': '#fecdd3',
    '300': '#fda4af',
    '400': '#fb7185',
    '500': '#f43f5e',
    '600': '#e11d48',
    '700': '#be123c',
    '800': '#9f1239',
    '900': '#881337',
  },
  blue: {
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bfdbfe',
    '300': '#93c5fd',
    '400': '#60a5fa',
    '500': '#3b82f6',
    '600': '#2563eb',
    '700': '#1d4ed8',
    '800': '#1e40af',
    '900': '#1e3a8a',
  },
  green: {
    '50': '#f0fdf4',
    '100': '#dcfce7',
    '200': '#bbf7d0',
    '300': '#86efac',
    '400': '#4ade80',
    '500': '#22c55e',
    '600': '#16a34a',
    '700': '#15803d',
    '800': '#166534',
    '900': '#14532d',
  },
  purple: {
    '50': '#faf5ff',
    '100': '#f3e8ff',
    '200': '#e9d5ff',
    '300': '#d8b4fe',
    '400': '#c084fc',
    '500': '#a855f7',
    '600': '#9333ea',
    '700': '#7e22ce',
    '800': '#6b21a8',
    '900': '#581c87',
  },
  orange: {
    '50': '#fff7ed',
    '100': '#ffedd5',
    '200': '#fed7aa',
    '300': '#fdba74',
    '400': '#fb923c',
    '500': '#f97316',
    '600': '#ea580c',
    '700': '#c2410c',
    '800': '#9a3412',
    '900': '#7c2d12',
  },
  black: {
    '50': '#fafafa',
    '100': '#f4f4f5',
    '200': '#e4e4e7',
    '300': '#d4d4d8',
    '400': '#a1a1aa',
    '500': '#71717a',
    '600': '#52525b',
    '700': '#3f3f46',
    '800': '#27272a',
    '900': '#18181b',
  },
};

const SAMPLE_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
];
const SAMPLE_PRODUCTS = [
  { id: '1', name: 'Premium Headphones', category: 'Electronics', price: 199 },
  { id: '2', name: 'Designer T-Shirt', category: 'Clothing', price: 49 },
  { id: '3', name: 'Smart Watch', category: 'Electronics', price: 299 },
  { id: '4', name: 'Running Shoes', category: 'Sports', price: 129 },
  { id: '5', name: 'Ceramic Vase', category: 'Home & Garden', price: 79 },
  { id: '6', name: 'Wireless Speaker', category: 'Electronics', price: 149 },
];

export function BlurredStorePreview() {
  const { data, step, unblurredSections, isPreviewAnimating } =
    useRegistration();
  const colors = ACCENT_COLORS[data.brandColor] || ACCENT_COLORS.indigo;

  const isHeaderUnblurred = unblurredSections.includes('header');
  const isHeroUnblurred = unblurredSections.includes('hero');

  // Hide header logo on step 1 or while animation is playing
  const hideHeaderLogo = step === 1 || isPreviewAnimating;

  const storeName = data.storeName || 'Your Store';
  const storeInitial = storeName.charAt(0).toUpperCase() || 'S';
  const description =
    data.description ||
    'Your store description will appear here. Make it compelling!';
  const authorName = data.authorName || 'Your Name';

  return (
    <div className="fixed inset-0 overflow-auto pointer-events-none bg-gray-50 dark:bg-zinc-900">
      {/* ===== Small Top Bar (ShopIt branding) ===== */}
      <div
        className={`bg-gray-900 dark:bg-zinc-950 transition-all duration-700 ${
          isHeaderUnblurred ? 'blur-0' : 'blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10">
          <div className="flex items-center justify-between h-full">
            {/* ShopIt Logo placeholder */}
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{
                  background: `linear-gradient(135deg, ${colors['500']} 0%, ${colors['700']} 100%)`,
                }}
              >
                S
              </div>
              <span className="text-white text-sm font-medium">ShopIt</span>
            </div>
            {/* Right side buttons */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-300">Login</span>
              <span className="text-xs text-gray-300">Register</span>
              <span
                className="text-xs px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: colors['500'] }}
              >
                Create Your Shop
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Main Store Header ===== */}
      <header
        className={`bg-white dark:bg-zinc-900 shadow-sm transition-all duration-700 relative z-10 ${
          isHeaderUnblurred ? 'blur-0' : 'blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo / Store Name - Hidden on step 1 and while animation is playing */}
            <div
              className={`flex items-center gap-3 flex-shrink-0 transition-opacity duration-0 ${
                hideHeaderLogo ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {data.logoPreview && !data.useInitialAsLogo ? (
                <img
                  src={data.logoPreview}
                  alt={storeName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors duration-500"
                  style={{ backgroundColor: colors['500'] }}
                >
                  {storeInitial}
                </div>
              )}
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {storeName}
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 ml-10">
              <span className="text-gray-600 dark:text-gray-300">Products</span>
              <span className="text-gray-600 dark:text-gray-300">
                Categories
              </span>
              <span className="text-gray-600 dark:text-gray-300">About</span>
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side - Theme, Language, Cart */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <div className="p-2 text-gray-600 dark:text-gray-300">
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
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                <span className="px-2 py-1 rounded-md text-gray-600 dark:text-gray-400 text-xs">
                  ქარ
                </span>
                <span
                  className="px-2 py-1 rounded-md text-white text-xs"
                  style={{ backgroundColor: colors['500'] }}
                >
                  ENG
                </span>
              </div>

              {/* Cart */}
              <div className="p-2 text-gray-600 dark:text-gray-300">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section
        className={`relative overflow-hidden transition-all duration-700 ${
          isHeroUnblurred ? 'blur-0' : 'blur-md'
        }`}
      >
        {/* Background - Cover Image or Gradient */}
        {data.coverPreview && !data.useDefaultCover ? (
          <>
            <div className="absolute inset-0">
              <img
                src={data.coverPreview}
                alt="Store cover"
                className="w-full h-full object-cover"
              />
              {/* Overlay for text readability */}
              <div className="absolute inset-0 bg-black/40" />
            </div>
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 transition-colors duration-500"
              style={{
                background: `linear-gradient(135deg, ${colors['500']} 0%, ${colors['700']} 100%)`,
              }}
            />
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
                style={{ backgroundColor: colors['300'] }}
              />
              <div
                className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-20"
                style={{ backgroundColor: colors['300'] }}
              />
            </div>
          </>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center">
            {/* Store Avatar */}
            <div className="mb-6">
              {data.logoPreview && !data.useInitialAsLogo ? (
                <img
                  src={data.logoPreview}
                  alt={storeName}
                  className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-white/30 shadow-xl"
                />
              ) : (
                <div
                  className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white font-bold text-4xl border-4 border-white/30 shadow-xl transition-colors duration-500"
                  style={{ backgroundColor: colors['700'] }}
                >
                  {storeInitial}
                </div>
              )}
            </div>

            {/* Store Name */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {storeName}
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8">
              {description}
            </p>

            {/* Owner */}
            {data.showAuthorName && (
              <div className="flex items-center justify-center gap-2 text-white/80">
                <span>by</span>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: colors['800'] }}
                >
                  {authorName.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{authorName}</span>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <span className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-lg shadow-lg">
                Browse Products
              </span>
              <span className="px-8 py-4 bg-white/10 text-white border border-white/30 rounded-xl font-semibold text-lg backdrop-blur-sm">
                Learn More
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Categories Section ===== */}
      <section className="py-12 bg-white dark:bg-zinc-900 blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Categories
          </h2>
          <div className="flex flex-wrap gap-3">
            <span
              className="px-5 py-2.5 rounded-full font-medium text-white shadow-lg"
              style={{ backgroundColor: colors['500'] }}
            >
              All
            </span>
            {SAMPLE_CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="px-5 py-2.5 rounded-full font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Products Section ===== */}
      <section className="py-12 bg-gray-50 dark:bg-zinc-800 blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_PRODUCTS.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Product Image Placeholder */}
                <div
                  className="aspect-square flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${colors['100']} 0%, ${colors['200']} 100%)`,
                  }}
                >
                  <svg
                    className="w-16 h-16 opacity-40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: colors['500'] }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                {/* Product Info */}
                <div className="p-5">
                  <span
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: colors['600'] }}
                  >
                    {product.category}
                  </span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1 mb-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      ₾{product.price}
                    </span>
                    <span
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{ backgroundColor: colors['500'] }}
                    >
                      Add to Cart
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Store Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: colors['500'] }}
                >
                  {storeInitial}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white text-lg">
                  {storeName}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {description}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Quick Links
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li>Products</li>
                <li>Categories</li>
                <li>About Us</li>
                <li>Contact</li>
              </ul>
            </div>

            {/* Follow Us */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Follow Us
              </h3>
              <div className="flex gap-4 text-gray-400">
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700" />
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700" />
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700" />
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-zinc-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                © 2025 {storeName}. All rights reserved.
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Powered by <span style={{ color: colors['500'] }}>ShopIt</span>
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== Animated preview element - flies from center to header ===== */}
      {isPreviewAnimating && (
        <div
          className="fixed z-50 flex items-center gap-3 animate-fly-to-header"
          style={
            {
              '--start-x': 'calc(50vw - 80px)',
              '--start-y': 'calc(50vh - 120px)',
              // End position: on wide screens use (100vw - 80rem)/2 + padding, on narrow screens just use padding
              '--end-x': 'calc(max(0px, (100vw - 80rem) / 2) + 1rem + 8px)',
              '--end-y': '53px',
            } as React.CSSProperties
          }
        >
          {data.logoPreview && !data.useInitialAsLogo ? (
            <img
              src={data.logoPreview}
              alt="Store logo"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: colors['500'] }}
            >
              {storeInitial}
            </div>
          )}
          <span className="font-semibold text-gray-900 dark:text-white text-lg">
            {storeName}
          </span>
        </div>
      )}
    </div>
  );
}
