//@ts-check

const { composePlugins, withNx } = require('@nx/next');
const createNextIntlPlugin = require('next-intl/plugin');
const withSerwist = require('@serwist/next').default;

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},

  // Configure remote image domains for next/image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'shopit-s3.s3.eu-north-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },

  // Proxy API requests through Next.js to avoid third-party cookie issues
  // This makes cookies "first-party" since they're on the same domain
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Remove any trailing slash and /api/v1 suffix for the destination
    const apiBase = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },

  // Allow embedding in iframes from any origin
  // WARNING: This removes clickjacking protection - only enable if you need iframe embedding
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *',
          },
        ],
      },
    ];
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
  withNextIntl,
  // PWA service worker - must be last to wrap properly
  /** @param {import('next').NextConfig} config */
  (config) =>
    withSerwist({
      swSrc: 'src/sw.ts',
      swDest: 'public/sw.js',
      // Disable in development
      disable: process.env.NODE_ENV === 'development',
    })(config),
];

module.exports = composePlugins(...plugins)(nextConfig);
