export const locales = ['ka', 'en'] as const;
export const defaultLocale = 'ka' as const;

export type Locale = (typeof locales)[number];
