import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getStoreBySubdomain } from '../../../../data/mock-stores';
import { StoreHeader } from '../../../../components/store/StoreHeader';
import { StoreFooter } from '../../../../components/store/StoreFooter';
import { ThemeProvider } from '../../../../components/theme/ThemeProvider';
import { routing } from '../../../../i18n/routing';
import '../../../global.css';

// Accent color CSS variables mapping
const ACCENT_COLORS: Record<string, Record<string, string>> = {
  rose: {
    '--store-accent-50': '#fff1f2',
    '--store-accent-100': '#ffe4e6',
    '--store-accent-200': '#fecdd3',
    '--store-accent-300': '#fda4af',
    '--store-accent-400': '#fb7185',
    '--store-accent-500': '#f43f5e',
    '--store-accent-600': '#e11d48',
    '--store-accent-700': '#be123c',
    '--store-accent-800': '#9f1239',
    '--store-accent-900': '#881337',
  },
  blue: {
    '--store-accent-50': '#eff6ff',
    '--store-accent-100': '#dbeafe',
    '--store-accent-200': '#bfdbfe',
    '--store-accent-300': '#93c5fd',
    '--store-accent-400': '#60a5fa',
    '--store-accent-500': '#3b82f6',
    '--store-accent-600': '#2563eb',
    '--store-accent-700': '#1d4ed8',
    '--store-accent-800': '#1e40af',
    '--store-accent-900': '#1e3a8a',
  },
  green: {
    '--store-accent-50': '#f0fdf4',
    '--store-accent-100': '#dcfce7',
    '--store-accent-200': '#bbf7d0',
    '--store-accent-300': '#86efac',
    '--store-accent-400': '#4ade80',
    '--store-accent-500': '#22c55e',
    '--store-accent-600': '#16a34a',
    '--store-accent-700': '#15803d',
    '--store-accent-800': '#166534',
    '--store-accent-900': '#14532d',
  },
  purple: {
    '--store-accent-50': '#faf5ff',
    '--store-accent-100': '#f3e8ff',
    '--store-accent-200': '#e9d5ff',
    '--store-accent-300': '#d8b4fe',
    '--store-accent-400': '#c084fc',
    '--store-accent-500': '#a855f7',
    '--store-accent-600': '#9333ea',
    '--store-accent-700': '#7e22ce',
    '--store-accent-800': '#6b21a8',
    '--store-accent-900': '#581c87',
  },
  orange: {
    '--store-accent-50': '#fff7ed',
    '--store-accent-100': '#ffedd5',
    '--store-accent-200': '#fed7aa',
    '--store-accent-300': '#fdba74',
    '--store-accent-400': '#fb923c',
    '--store-accent-500': '#f97316',
    '--store-accent-600': '#ea580c',
    '--store-accent-700': '#c2410c',
    '--store-accent-800': '#9a3412',
    '--store-accent-900': '#7c2d12',
  },
  indigo: {
    '--store-accent-50': '#eef2ff',
    '--store-accent-100': '#e0e7ff',
    '--store-accent-200': '#c7d2fe',
    '--store-accent-300': '#a5b4fc',
    '--store-accent-400': '#818cf8',
    '--store-accent-500': '#6366f1',
    '--store-accent-600': '#4f46e5',
    '--store-accent-700': '#4338ca',
    '--store-accent-800': '#3730a3',
    '--store-accent-900': '#312e81',
  },
  black: {
    '--store-accent-50': '#fafafa',
    '--store-accent-100': '#f4f4f5',
    '--store-accent-200': '#e4e4e7',
    '--store-accent-300': '#d4d4d8',
    '--store-accent-400': '#a1a1aa',
    '--store-accent-500': '#71717a',
    '--store-accent-600': '#52525b',
    '--store-accent-700': '#3f3f46',
    '--store-accent-800': '#27272a',
    '--store-accent-900': '#18181b',
  },
};

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: StoreLayoutProps): Promise<Metadata> {
  const { subdomain } = await params;
  const store = getStoreBySubdomain(subdomain);

  return {
    title: store?.name || 'Store',
    description: store?.description || 'Welcome to our store',
  };
}

export default async function StoreLayout({
  children,
  params,
}: StoreLayoutProps) {
  const { subdomain, locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as 'en' | 'ka')) {
    notFound();
  }

  // Get store data
  const store = getStoreBySubdomain(subdomain);

  if (!store) {
    notFound();
  }

  // Get accent colors for this store
  const accentColors = ACCENT_COLORS[store.accentColor] || ACCENT_COLORS.indigo;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Prevent theme flash - runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <div
            className="min-h-screen flex flex-col bg-gray-50 dark:bg-zinc-900"
            style={accentColors as React.CSSProperties}
          >
            <StoreHeader store={store} />
            <main className="flex-1">{children}</main>
            <StoreFooter store={store} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
