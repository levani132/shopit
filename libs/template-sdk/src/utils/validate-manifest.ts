interface ValidationError {
  path: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const REQUIRED_PAGES = ['home', 'products', 'productDetail', 'about'] as const;
const VALID_CATEGORIES = ['general', 'fashion', 'electronics', 'food', 'services', 'handmade', 'other'] as const;
const VALID_PRICING_TYPES = ['free', 'one-time', 'subscription'] as const;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+/;

/**
 * Validate a parsed shopit.template.json manifest object.
 * Returns structured errors rather than throwing.
 */
export function validateManifest(manifest: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: [{ path: '', message: 'Manifest must be an object' }] };
  }

  const m = manifest as Record<string, unknown>;

  // Required string fields
  if (typeof m.id !== 'string' || !ID_PATTERN.test(m.id)) {
    errors.push({ path: 'id', message: 'Must be a lowercase slug (3-64 chars, letters, numbers, hyphens)' });
  }

  if (!isLocalizedText(m.name)) {
    errors.push({ path: 'name', message: 'Must be an object with at least "en" or "ka" string field' });
  }

  if (!isLocalizedText(m.description)) {
    errors.push({ path: 'description', message: 'Must be an object with at least "en" or "ka" string field' });
  }

  if (typeof m.version !== 'string' || !SEMVER_PATTERN.test(m.version)) {
    errors.push({ path: 'version', message: 'Must be a valid semver string (e.g. "1.0.0")' });
  }

  if (typeof m.author !== 'string' || m.author.length === 0) {
    errors.push({ path: 'author', message: 'Must be a non-empty string' });
  }

  if (typeof m.sdkVersion !== 'string' || !SEMVER_PATTERN.test(m.sdkVersion)) {
    errors.push({ path: 'sdkVersion', message: 'Must be a valid semver string' });
  }

  if (typeof m.category !== 'string' || !(VALID_CATEGORIES as readonly string[]).includes(m.category)) {
    errors.push({ path: 'category', message: `Must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }

  if (typeof m.main !== 'string' || m.main.length === 0) {
    errors.push({ path: 'main', message: 'Must be a non-empty string (entry point path)' });
  }

  // Pricing
  if (!m.pricing || typeof m.pricing !== 'object') {
    errors.push({ path: 'pricing', message: 'Must be an object with a "type" field' });
  } else {
    const pricing = m.pricing as Record<string, unknown>;
    if (!(VALID_PRICING_TYPES as readonly string[]).includes(pricing.type as string)) {
      errors.push({ path: 'pricing.type', message: `Must be one of: ${VALID_PRICING_TYPES.join(', ')}` });
    }
    if (pricing.type === 'one-time' && (typeof pricing.price !== 'number' || pricing.price <= 0)) {
      errors.push({ path: 'pricing.price', message: 'Required for one-time pricing and must be > 0' });
    }
    if (pricing.type === 'subscription' && (typeof pricing.monthlyPrice !== 'number' || pricing.monthlyPrice <= 0)) {
      errors.push({ path: 'pricing.monthlyPrice', message: 'Required for subscription pricing and must be > 0' });
    }
  }

  // Assets
  if (!m.assets || typeof m.assets !== 'object') {
    errors.push({ path: 'assets', message: 'Must be an object with a "thumbnail" field' });
  } else {
    const assets = m.assets as Record<string, unknown>;
    if (typeof assets.thumbnail !== 'string' || assets.thumbnail.length === 0) {
      errors.push({ path: 'assets.thumbnail', message: 'Must be a non-empty string (path to thumbnail)' });
    }
  }

  // Pages
  if (!Array.isArray(m.pages)) {
    errors.push({ path: 'pages', message: 'Must be an array' });
  } else {
    for (const requiredPage of REQUIRED_PAGES) {
      if (!m.pages.includes(requiredPage)) {
        errors.push({ path: 'pages', message: `Missing required page: "${requiredPage}"` });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function isLocalizedText(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (typeof obj.en === 'string' && obj.en.length > 0) ||
         (typeof obj.ka === 'string' && obj.ka.length > 0);
}
