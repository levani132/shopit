/**
 * Tenant Configuration System
 *
 * Each store subdomain is a tenant with its own:
 * - Brand color for theming
 * - Display name for PWA
 * - PWA icons
 *
 * Tenant data is fetched from the API, but we provide defaults
 * and color mapping for PWA icons.
 */

import {
  ACCENT_COLORS,
  AccentColorName,
  STORE_BRAND_COLORS,
  DEFAULT_ACCENT_COLOR_NAME,
} from '@shopit/constants';

export interface TenantConfig {
  slug: string;
  displayName: string;
  accentColorName: AccentColorName;
  colors: {
    500: string;
    600: string;
    700: string;
  };
  fullColors: (typeof STORE_BRAND_COLORS)[AccentColorName];
}

/**
 * Map store accent color to a valid AccentColorName
 * Stores may have custom colors, but icons only exist for predefined colors
 */
export function mapToAccentColor(colorName?: string): AccentColorName {
  if (!colorName) return DEFAULT_ACCENT_COLOR_NAME;

  const validColors = Object.keys(ACCENT_COLORS) as AccentColorName[];
  if (validColors.includes(colorName as AccentColorName)) {
    return colorName as AccentColorName;
  }

  // Map similar colors to available ones
  const colorMap: Record<string, AccentColorName> = {
    red: 'rose',
    pink: 'rose',
    violet: 'purple',
    cyan: 'blue',
    teal: 'green',
    lime: 'green',
    yellow: 'orange',
    amber: 'orange',
    gray: 'black',
    grey: 'black',
    zinc: 'black',
    slate: 'black',
    neutral: 'black',
  };

  return colorMap[colorName.toLowerCase()] || DEFAULT_ACCENT_COLOR_NAME;
}

/**
 * Build tenant config from store data
 */
export function buildTenantConfig(
  subdomain: string,
  storeName?: string,
  storeAccentColor?: string,
): TenantConfig {
  const accentColorName = mapToAccentColor(storeAccentColor);
  const colors = ACCENT_COLORS[accentColorName];
  const fullColors = STORE_BRAND_COLORS[accentColorName];

  // Truncate display name for PWA short_name (max 12 chars recommended)
  const displayName = storeName || subdomain;
  const shortName =
    displayName.length > 12 ? displayName.substring(0, 12) : displayName;

  return {
    slug: subdomain,
    displayName: shortName,
    accentColorName,
    colors,
    fullColors,
  };
}

/**
 * Get icon paths for a tenant
 */
export function getTenantIconPaths(accentColorName: AccentColorName) {
  const color = accentColorName;

  return {
    // PWA icons
    pwa: {
      '48x48': `/icons/${color}/pwa/icon-48x48.png`,
      '72x72': `/icons/${color}/pwa/icon-72x72.png`,
      '96x96': `/icons/${color}/pwa/icon-96x96.png`,
      '128x128': `/icons/${color}/pwa/icon-128x128.png`,
      '144x144': `/icons/${color}/pwa/icon-144x144.png`,
      '192x192': `/icons/${color}/pwa/icon-192x192.png`,
      '256x256': `/icons/${color}/pwa/icon-256x256.png`,
      '384x384': `/icons/${color}/pwa/icon-384x384.png`,
      '512x512': `/icons/${color}/pwa/icon-512x512.png`,
    },
    // Favicon
    favicon: {
      ico: `/icons/${color}/favicon/favicon.ico`,
      '16x16': `/icons/${color}/favicon/icon-16x16.png`,
      '32x32': `/icons/${color}/favicon/icon-32x32.png`,
      '48x48': `/icons/${color}/favicon/icon-48x48.png`,
    },
    // iOS - use 180x180 for apple-touch-icon (standard size for all iOS devices)
    // We don't have 180x180 so use the closest: 1024x1024 for high quality
    // iOS will scale it down. Alternatively use 76x76 for older iPads.
    ios: {
      // Using largest available for best quality - iOS scales down automatically
      appleTouchIcon: `/icons/${color}/ios/icon-1024x1024.png`,
      // Specific sizes if needed
      '60x60': `/icons/${color}/ios/icon-60x60.png`,
      '76x76': `/icons/${color}/ios/icon-76x76.png`,
      '1024x1024': `/icons/${color}/ios/icon-1024x1024.png`,
    },
    // Android
    android: {
      '192x192': `/icons/${color}/android/icon-192x192.png`,
      '512x512': `/icons/${color}/android/icon-512x512.png`,
    },
  };
}

/**
 * Generate CSS variables for tenant theming
 */
export function getTenantCssVariables(
  config: TenantConfig,
): Record<string, string> {
  const { fullColors } = config;

  return {
    '--store-accent-50': fullColors[50],
    '--store-accent-100': fullColors[100],
    '--store-accent-200': fullColors[200],
    '--store-accent-300': fullColors[300],
    '--store-accent-400': fullColors[400],
    '--store-accent-500': fullColors[500],
    '--store-accent-600': fullColors[600],
    '--store-accent-700': fullColors[700],
    '--store-accent-800': fullColors[800],
    '--store-accent-900': fullColors[900],
    // Simplified brand colors
    '--brand-500': config.colors[500],
    '--brand-600': config.colors[600],
    '--brand-700': config.colors[700],
  };
}
