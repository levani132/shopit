/**
 * Utilities for handling subdomain URLs dynamically
 * Works in both development (localhost) and production (shopit.ge, etc.)
 * Supports dev environment with *.dev.shopit.ge pattern
 *
 * CENTRALIZED URL UTILITIES - Use these instead of duplicating logic!
 */

/**
 * Environment detection based on hostname
 * Returns 'dev' for dev.shopit.ge or dev.localhost, 'production' otherwise
 */
export function getEnvironment(hostname?: string): 'dev' | 'production' {
  const host =
    hostname ||
    (typeof window !== 'undefined' ? window.location.hostname : 'shopit.ge');

  // Check for dev environment patterns
  if (
    host === 'dev.localhost' ||
    host.endsWith('.dev.localhost') ||
    host === 'dev.shopit.ge' ||
    host.endsWith('.dev.shopit.ge')
  ) {
    return 'dev';
  }

  return 'production';
}

/**
 * Get the base domain from the current window location
 * Handles dev environments: dev.shopit.ge, dev.localhost
 * e.g., shopit.ge from www.shopit.ge, shop.shopit.ge, or just shopit.ge
 * e.g., dev.shopit.ge from shop.dev.shopit.ge
 * e.g., localhost:3000 from shop.localhost:3000 or just localhost:3000
 * e.g., dev.localhost:3000 from shop.dev.localhost:3000
 */
export function getBaseDomain(): {
  baseDomain: string;
  port: string;
  protocol: string;
  isDev: boolean;
} {
  if (typeof window === 'undefined') {
    // SSR fallback - return production values
    return {
      baseDomain: 'shopit.ge',
      port: '',
      protocol: 'https:',
      isDev: false,
    };
  }

  const { protocol, host } = window.location;
  const [hostname, port] = host.split(':');

  // For dev.localhost (dev environment with localhost)
  if (hostname === 'dev.localhost' || hostname.endsWith('.dev.localhost')) {
    return {
      baseDomain: 'dev.localhost',
      port: port || '',
      protocol,
      isDev: true,
    };
  }

  // For regular localhost (no subdomain or with store subdomain)
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return {
      baseDomain: 'localhost',
      port: port || '',
      protocol,
      isDev: false,
    };
  }

  // For dev.shopit.ge environment
  if (hostname === 'dev.shopit.ge' || hostname.endsWith('.dev.shopit.ge')) {
    return {
      baseDomain: 'dev.shopit.ge',
      port: port || '',
      protocol,
      isDev: true,
    };
  }

  // For production domains, get the last two parts (e.g., shopit.ge)
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const baseDomain = parts.slice(-2).join('.');
    return { baseDomain, port: port || '', protocol, isDev: false };
  }

  // Single-part hostname fallback
  return { baseDomain: hostname, port: port || '', protocol, isDev: false };
}

/**
 * Get the main site URL from a subdomain
 * e.g., storename.shopit.ge → https://shopit.ge
 * e.g., storename.dev.shopit.ge → https://dev.shopit.ge
 * e.g., sample.localhost:3000 → http://localhost:3000
 * e.g., sample.dev.localhost:3000 → http://dev.localhost:3000
 * Returns empty string if already on main domain
 */
export function getMainSiteUrl(): string {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  const portSuffix = port ? `:${port}` : '';

  // For dev.localhost subdomains (e.g., sample.dev.localhost)
  if (hostname.endsWith('.dev.localhost')) {
    return `${protocol}//dev.localhost${portSuffix}`;
  }

  // If on dev.localhost (no subdomain)
  if (hostname === 'dev.localhost') {
    return '';
  }

  // For localhost subdomains (e.g., sample.localhost)
  if (hostname.endsWith('.localhost')) {
    return `${protocol}//localhost${portSuffix}`;
  }

  // If on plain localhost (no subdomain)
  if (hostname === 'localhost') {
    return '';
  }

  // For dev.shopit.ge subdomains (e.g., sample.dev.shopit.ge)
  if (hostname.endsWith('.dev.shopit.ge')) {
    return `${protocol}//dev.shopit.ge`;
  }

  // If on dev.shopit.ge (no subdomain)
  if (hostname === 'dev.shopit.ge') {
    return '';
  }

  // Split hostname into parts
  const parts = hostname.split('.');

  // If we have a subdomain (e.g., storename.shopit.ge has 3 parts)
  // Remove the first part to get the main domain
  if (parts.length >= 3) {
    const mainDomain = parts.slice(1).join('.');
    return `${protocol}//${mainDomain}`;
  }

  // Already on main domain (2 parts like shopit.ge)
  return '';
}

/**
 * Generate a full URL for a store subdomain
 * Respects the current environment (dev vs production)
 * e.g., getStoreUrl('myshop') -> https://myshop.shopit.ge or http://myshop.localhost:3000
 * e.g., on dev.shopit.ge: getStoreUrl('myshop') -> https://myshop.dev.shopit.ge
 */
export function getStoreUrl(subdomain: string): string {
  const { baseDomain, port, protocol } = getBaseDomain();

  const host = port
    ? `${subdomain}.${baseDomain}:${port}`
    : `${subdomain}.${baseDomain}`;

  return `${protocol}//${host}`;
}

/**
 * Generate a product URL for a specific store
 * e.g., getStoreProductUrl('myshop', 'abc123', 'en') -> https://myshop.shopit.ge/en/products/abc123
 */
export function getStoreProductUrl(
  subdomain: string,
  productId: string,
  locale: string,
): string {
  return `${getStoreUrl(subdomain)}/${locale}/products/${productId}`;
}

/**
 * Generate the couriers subdomain URL based on current hostname
 * Respects the current environment (dev vs production)
 * e.g., shopit.ge -> https://couriers.shopit.ge
 * e.g., dev.shopit.ge -> https://couriers.dev.shopit.ge
 * e.g., localhost:3000 -> http://couriers.localhost:3000
 */
export function getCouriersUrl(): string {
  if (typeof window === 'undefined') {
    // SSR fallback
    return 'https://couriers.shopit.ge';
  }

  return getStoreUrl('couriers');
}

/**
 * Check if we're currently on a store subdomain
 * Handles dev environments properly
 */
export function isOnStoreSubdomain(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const { host } = window.location;
  const [hostname] = host.split(':');

  // Main domains (no subdomain)
  if (
    hostname === 'localhost' ||
    hostname === 'dev.localhost' ||
    hostname === 'shopit.ge' ||
    hostname === 'dev.shopit.ge' ||
    hostname === 'www.shopit.ge'
  ) {
    return false;
  }

  // Check if on a subdomain (ends with .localhost or .dev.localhost)
  if (hostname.endsWith('.dev.localhost')) {
    return true;
  }

  if (hostname.endsWith('.localhost')) {
    return true;
  }

  // Check for dev.shopit.ge subdomains (e.g., shop.dev.shopit.ge)
  if (hostname.endsWith('.dev.shopit.ge')) {
    return true;
  }

  const parts = hostname.split('.');
  // If more than 2 parts (e.g., shop.shopit.ge), we're on a subdomain
  // Exclude www as a subdomain
  if (parts.length > 2 && parts[0] !== 'www') {
    return true;
  }

  return false;
}

/**
 * Extract the store subdomain from the current hostname
 * Returns null if not on a store subdomain
 * e.g., sample.localhost -> 'sample'
 * e.g., sample.dev.localhost -> 'sample'
 * e.g., sample.shopit.ge -> 'sample'
 * e.g., sample.dev.shopit.ge -> 'sample'
 */
export function getStoreSubdomain(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const { host } = window.location;
  const [hostname] = host.split(':');

  // For dev.localhost subdomains
  if (hostname.endsWith('.dev.localhost')) {
    return hostname.replace('.dev.localhost', '');
  }

  // For regular localhost subdomains
  if (hostname.endsWith('.localhost')) {
    return hostname.replace('.localhost', '');
  }

  // For dev.shopit.ge subdomains
  if (hostname.endsWith('.dev.shopit.ge')) {
    return hostname.replace('.dev.shopit.ge', '');
  }

  // For production domains (e.g., sample.shopit.ge)
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'dev') {
    return parts[0];
  }

  return null;
}
