/**
 * Generates a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validates a subdomain format
 * - Must start with a letter
 * - Can contain letters, numbers, and hyphens
 * - Must be 3-63 characters long
 * - Cannot start or end with a hyphen
 */
export function isValidSubdomain(subdomain: string): boolean {
  const regex = /^[a-z][a-z0-9-]{1,61}[a-z0-9]$/;
  return regex.test(subdomain) && !subdomain.includes('--');
}

/**
 * Sanitizes a subdomain by removing invalid characters
 */
export function sanitizeSubdomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}
