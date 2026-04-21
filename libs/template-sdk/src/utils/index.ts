import type { LocalizedText, TemplateDefinition } from '../types/template.types.js';

/**
 * Resolve a bilingual text field to the current locale.
 */
export function getLocalizedText(
  localized: LocalizedText | undefined,
  fallback: string | undefined,
  locale: string,
): string {
  if (localized) {
    return (locale === 'ka' ? localized.ka : localized.en) || fallback || '';
  }
  return fallback || '';
}

/**
 * Format a price as a GEL currency string.
 */
export function formatPrice(price: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale === 'ka' ? 'ka-GE' : 'en-US', {
    style: 'currency',
    currency: 'GEL',
    minimumFractionDigits: 2,
  }).format(price);
}

/**
 * Helper to define a template with full type inference.
 * Ensures the template definition satisfies the TemplateDefinition interface.
 */
export function defineTemplate(template: TemplateDefinition): TemplateDefinition {
  return template;
}
