import { MetadataRoute } from 'next';
import { getStoreBySubdomain } from '../../../lib/api';
import {
  buildTenantConfig,
  getTenantIconPaths,
  mapToAccentColor,
} from '../../../lib/tenant-config';

/**
 * Dynamic Web App Manifest for each store subdomain
 *
 * Each subdomain generates its own manifest with:
 * - Store-specific name and branding
 * - Brand-colored icons
 * - Standalone PWA configuration
 *
 * This makes each store installable as a separate PWA.
 */
export default async function manifest({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<MetadataRoute.Manifest> {
  const { subdomain } = await params;

  // Fetch store data for proper naming and branding
  const store = await getStoreBySubdomain(subdomain);

  // Build tenant config (with fallbacks if store not found)
  const tenantConfig = buildTenantConfig(
    subdomain,
    store?.name,
    store?.brandColor,
  );

  // Get icon paths for this tenant's accent color
  const colorName = mapToAccentColor(store?.brandColor);
  const iconPaths = getTenantIconPaths(colorName);

  // Theme color - use the 600 shade for good visibility
  const themeColor = tenantConfig.colors[600];

  // Background color - using white for light mode
  // Note: manifest can't switch dynamically based on user's color scheme
  const backgroundColor = '#ffffff';

  // Build the manifest
  return {
    name: `${tenantConfig.displayName} • ShopIt`,
    short_name: tenantConfig.displayName,
    description: store?.description || `Shop at ${tenantConfig.displayName}`,
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: themeColor,
    background_color: backgroundColor,
    categories: ['shopping', 'business'],
    // PWA icons - using existing icon files
    icons: [
      {
        src: `${iconPaths.pwa['192x192']}?v=1`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${iconPaths.pwa['512x512']}?v=1`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      // Maskable icons for Android adaptive icons
      {
        src: `${iconPaths.pwa['192x192']}?v=1`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `${iconPaths.pwa['512x512']}?v=1`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      // Additional sizes for better device coverage
      {
        src: `${iconPaths.pwa['48x48']}?v=1`,
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: `${iconPaths.pwa['72x72']}?v=1`,
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: `${iconPaths.pwa['96x96']}?v=1`,
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: `${iconPaths.pwa['128x128']}?v=1`,
        sizes: '128x128',
        type: 'image/png',
      },
      {
        src: `${iconPaths.pwa['144x144']}?v=1`,
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: `${iconPaths.pwa['256x256']}?v=1`,
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: `${iconPaths.pwa['384x384']}?v=1`,
        sizes: '384x384',
        type: 'image/png',
      },
    ],
  };
}
