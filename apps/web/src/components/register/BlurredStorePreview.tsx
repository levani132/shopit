'use client';

import { useRegistration } from './RegistrationContext';
import { StoreData } from '../../data/mock-stores';

// Create a preview store based on registration data
function createPreviewStore(
  storeName: string,
  brandColor: string,
  authorName: string,
  description: string
): StoreData {
  return {
    subdomain: 'preview',
    name: storeName || 'Your Store Name',
    description: description || 'Your store description will appear here...',
    accentColor: brandColor,
    owner: {
      name: authorName || 'Your Name',
    },
    categories: ['Category 1', 'Category 2', 'Category 3', 'Category 4'],
    products: [
      {
        id: '1',
        name: 'Sample Product 1',
        description: 'Product description',
        price: 99,
        currency: 'GEL',
        image: '',
        category: 'Category 1',
        inStock: true,
      },
      {
        id: '2',
        name: 'Sample Product 2',
        description: 'Product description',
        price: 149,
        currency: 'GEL',
        image: '',
        category: 'Category 2',
        inStock: true,
      },
      {
        id: '3',
        name: 'Sample Product 3',
        description: 'Product description',
        price: 79,
        currency: 'GEL',
        image: '',
        category: 'Category 1',
        inStock: true,
      },
      {
        id: '4',
        name: 'Sample Product 4',
        description: 'Product description',
        price: 199,
        currency: 'GEL',
        image: '',
        category: 'Category 3',
        inStock: false,
      },
      {
        id: '5',
        name: 'Sample Product 5',
        description: 'Product description',
        price: 59,
        currency: 'GEL',
        image: '',
        category: 'Category 2',
        inStock: true,
      },
      {
        id: '6',
        name: 'Sample Product 6',
        description: 'Product description',
        price: 129,
        currency: 'GEL',
        image: '',
        category: 'Category 4',
        inStock: true,
      },
    ],
  };
}

// Accent color palettes
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

export function BlurredStorePreview() {
  const { data, unblurredSections } = useRegistration();
  const store = createPreviewStore(
    data.storeName,
    data.brandColor,
    data.authorName,
    data.description
  );

  const colors = ACCENT_COLORS[data.brandColor] || ACCENT_COLORS.indigo;

  const isUnblurred = (section: string) => unblurredSections.includes(section as typeof unblurredSections[number]);

  return (
    <div
      className="fixed inset-0 overflow-auto pointer-events-none"
      style={
        {
          '--store-accent-50': colors['50'],
          '--store-accent-100': colors['100'],
          '--store-accent-200': colors['200'],
          '--store-accent-300': colors['300'],
          '--store-accent-400': colors['400'],
          '--store-accent-500': colors['500'],
          '--store-accent-600': colors['600'],
          '--store-accent-700': colors['700'],
          '--store-accent-800': colors['800'],
          '--store-accent-900': colors['900'],
        } as React.CSSProperties
      }
    >
      {/* Header Preview */}
      <div
        className={`bg-white dark:bg-zinc-900 shadow-sm transition-all duration-500 ${
          isUnblurred('header') ? '' : 'blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          {/* Logo placeholder */}
          <div className="flex items-center gap-3">
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
                {store.name.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-gray-900 dark:text-white text-lg">
              {store.name}
            </span>
          </div>

          {/* Nav placeholder */}
          <nav className="hidden md:flex items-center gap-6 ml-10">
            <span className="text-gray-600 dark:text-gray-300">Products</span>
            <span className="text-gray-600 dark:text-gray-300">Categories</span>
            <span className="text-gray-600 dark:text-gray-300">About</span>
          </nav>
        </div>
      </div>

      {/* Hero Preview */}
      <div
        className={`py-20 transition-all duration-500 ${
          isUnblurred('hero') ? '' : 'blur-md'
        }`}
        style={{
          background: `linear-gradient(135deg, ${colors['500']} 0%, ${colors['700']} 100%)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {store.name}
          </h1>
          <p className="text-xl text-white/90 mb-4 max-w-2xl mx-auto">
            {store.description}
          </p>
          {data.showAuthorName && (
            <p className="text-white/80">by {store.owner.name}</p>
          )}
        </div>
      </div>

      {/* Categories Preview */}
      <div
        className={`py-8 bg-gray-50 dark:bg-zinc-800 transition-all duration-500 ${
          isUnblurred('categories') ? '' : 'blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 justify-center flex-wrap">
            {store.categories.map((cat) => (
              <span
                key={cat}
                className="px-4 py-2 rounded-full bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-300 shadow-sm"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Products Preview */}
      <div
        className={`py-12 bg-white dark:bg-zinc-900 transition-all duration-500 ${
          isUnblurred('products') ? '' : 'blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {store.products.map((product) => (
              <div
                key={product.id}
                className="bg-gray-100 dark:bg-zinc-800 rounded-xl p-4"
              >
                <div className="aspect-square bg-gray-200 dark:bg-zinc-700 rounded-lg mb-4" />
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {product.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  ₾{product.price}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Preview */}
      <div
        className={`py-8 bg-gray-100 dark:bg-zinc-800 transition-all duration-500 ${
          isUnblurred('footer') ? '' : 'blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            © 2025 {store.name}. Powered by ShopIt
          </p>
        </div>
      </div>
    </div>
  );
}

