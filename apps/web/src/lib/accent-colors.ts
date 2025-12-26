/**
 * Utility functions for accent color classes
 * Uses CSS variables that are set by AccentColorProvider
 */

export const accentColors = {
  bg: {
    primary: 'bg-[var(--accent-600)] dark:bg-[var(--accent-500)]',
    hover: 'hover:bg-[var(--accent-700)] dark:hover:bg-[var(--accent-600)]',
    light: 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30',
    lighter: 'bg-[var(--accent-50)]',
  },
  text: {
    primary: 'text-[var(--accent-600)] dark:text-[var(--accent-400)]',
    hover: 'hover:text-[var(--accent-700)] dark:hover:text-[var(--accent-300)]',
  },
  border: {
    primary: 'border-[var(--accent-300)] dark:border-[var(--accent-600)]',
    hover: 'hover:border-[var(--accent-400)] dark:hover:border-[var(--accent-500)]',
  },
  shadow: {
    sm: 'shadow-[var(--accent-200)]/40 dark:shadow-[var(--accent-900)]/50',
    md: 'shadow-[var(--accent-300)]/40 dark:shadow-[var(--accent-800)]/50',
  },
};

/**
 * Get button primary classes with accent color
 */
export function getButtonPrimaryClasses() {
  return `px-6 py-3 ${accentColors.bg.primary} text-white rounded-xl ${accentColors.bg.hover} transition-all font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5`;
}

/**
 * Get button secondary classes
 */
export function getButtonSecondaryClasses() {
  return 'px-6 py-3 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all font-semibold border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600';
}

