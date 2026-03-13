import type { LocalizedText } from './types';

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
