import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Viewport } from 'next';
import { routing } from '../../i18n/routing';
import { ClientProviders } from '../../components/layout/ClientProviders';
import { ConditionalLayout } from '../../components/layout/ConditionalLayout';
import { inter, notoSansGeorgian } from '../fonts';
import '../global.css';

type Params = Promise<{ locale: string }>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Main site uses blue accent color
const MAIN_SITE_COLOR = 'blue';
const MAIN_SITE_THEME_COLOR = '#2563eb'; // blue-600

export async function generateMetadata({ params }: { params: Params }) {
  const { locale } = await params;

  // Validate locale before trying to import messages
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return {
      title: 'ShopIt',
      description: 'Create your online store',
    };
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    // Icons - using PNG for crisp rendering
    icons: {
      icon: [
        { url: `/icons/${MAIN_SITE_COLOR}/favicon/favicon.ico`, sizes: 'any' },
        {
          url: `/icons/${MAIN_SITE_COLOR}/favicon/icon-32x32.png`,
          sizes: '32x32',
          type: 'image/png',
        },
        {
          url: `/icons/${MAIN_SITE_COLOR}/favicon/icon-16x16.png`,
          sizes: '16x16',
          type: 'image/png',
        },
      ],
      apple: [
        {
          url: `/icons/${MAIN_SITE_COLOR}/ios/icon-180x180.png`,
          sizes: '180x180',
        },
      ],
      shortcut: `/icons/${MAIN_SITE_COLOR}/favicon/favicon.ico`,
    },
    manifest: '/manifest.json',
  };
}

export function generateViewport(): Viewport {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: MAIN_SITE_THEME_COLOR },
      { media: '(prefers-color-scheme: dark)', color: '#18181b' },
    ],
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${notoSansGeorgian.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent theme flash - runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Theme detection
                  var theme = localStorage.getItem('theme');
                  if (theme) {
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                  } else {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.classList.toggle('dark', prefersDark);
                  }
                  
                  // Accent color detection
                  var accentColors = {
                    indigo: {50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81'},
                    pink: {50:'#fdf2f8',100:'#fce7f3',200:'#fbcfe8',300:'#f9a8d4',400:'#f472b6',500:'#ec4899',600:'#db2777',700:'#be185d',800:'#9f1239',900:'#831843'},
                    emerald: {50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857',800:'#065f46',900:'#064e3b'},
                    amber: {50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309',800:'#92400e',900:'#78350f'},
                    blue: {50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a'},
                    purple: {50:'#faf5ff',100:'#f3e8ff',200:'#e9d5ff',300:'#d8b4fe',400:'#c084fc',500:'#a855f7',600:'#9333ea',700:'#7e22ce',800:'#6b21a8',900:'#581c87'},
                    red: {50:'#fef2f2',100:'#fee2e2',200:'#fecaca',300:'#fca5a5',400:'#f87171',500:'#ef4444',600:'#dc2626',700:'#b91c1c',800:'#991b1b',900:'#7f1d1d'},
                    teal: {50:'#f0fdfa',100:'#ccfbf1',200:'#99f6e4',300:'#5eead4',400:'#2dd4bf',500:'#14b8a6',600:'#0d9488',700:'#0f766e',800:'#115e59',900:'#134e4a'}
                  };
                  var savedAccent = localStorage.getItem('accentColor') || 'blue';
                  var color = accentColors[savedAccent] || accentColors.blue;
                  Object.keys(color).forEach(function(shade) {
                    document.documentElement.style.setProperty('--accent-' + shade, color[shade]);
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white dark:bg-zinc-900 transition-colors">
        <NextIntlClientProvider messages={messages}>
          <ClientProviders>
            <ConditionalLayout>{children}</ConditionalLayout>
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
