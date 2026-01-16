/**
 * Utilities for handling subdomain URLs dynamically
 * Works in both development (localhost) and production (shopit.ge, etc.)
 *
 * CENTRALIZED URL UTILITIES - Use these instead of duplicating logic!
 */

/**
 * Get the base domain from the current window location
 * e.g., shopit.ge from www.shopit.ge, shop.shopit.ge, or just shopit.ge
 * e.g., localhost:3000 from shop.localhost:3000 or just localhost:3000
 */
export function getBaseDomain(): {
  baseDomain: string;
  port: string;
  protocol: string;
} {
  if (typeof window === 'undefined') {
    // SSR fallback - return production values
    return { baseDomain: 'shopit.ge', port: '', protocol: 'https:' };
  }

  const { protocol, host } = window.location;
  const [hostname, port] = host.split(':');

  // For localhost, always use localhost as base
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { baseDomain: 'localhost', port: port || '', protocol };
  }

  // For production domains, get the last two parts (e.g., shopit.ge)
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const baseDomain = parts.slice(-2).join('.');
    return { baseDomain, port: port || '', protocol };
  }

  // Single-part hostname fallback
  return { baseDomain: hostname, port: port || '', protocol };
}

/**
 * Get the main site URL from a subdomain
 * e.g., storename.shopit.ge → https://shopit.ge
 * e.g., sample.localhost:3000 → http://localhost:3000
 * Returns empty string if already on main domain
 */
export function getMainSiteUrl(): string {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  // For localhost subdomains (e.g., sample.localhost)
  if (hostname.endsWith('.localhost')) {
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}//localhost${portSuffix}`;
  }

  // If on plain localhost (no subdomain)
  if (hostname === 'localhost') {
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
 * e.g., getStoreUrl('myshop') -> https://myshop.shopit.ge or http://myshop.localhost:3000
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
 * e.g., shopit.ge -> https://couriers.shopit.ge
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
 */
export function isOnStoreSubdomain(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const { host } = window.location;
  const [hostname] = host.split(':');

  // localhost without subdomain
  if (hostname === 'localhost') {
    return false;
  }

  // Check if on a subdomain (more than 2 parts for production, ends with .localhost for dev)
  if (hostname.endsWith('.localhost')) {
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
