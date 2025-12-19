/**
 * Generates a lighter shade of a hex color
 */
export function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
}

/**
 * Generates a darker shade of a hex color
 */
export function darkenColor(hex: string, percent: number): string {
  return lightenColor(hex, -percent);
}

/**
 * Converts a hex color to RGB
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Converts RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Determines if a color is light or dark
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  // Using the luminance formula
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

/**
 * Gets a contrasting text color (black or white) for a background
 */
export function getContrastingTextColor(bgHex: string): string {
  return isLightColor(bgHex) ? '#000000' : '#ffffff';
}

/**
 * Generates CSS custom properties for a theme based on accent color
 */
export function generateThemeVariables(accentColor: string): Record<string, string> {
  return {
    '--accent-color': accentColor,
    '--accent-color-light': lightenColor(accentColor, 20),
    '--accent-color-dark': darkenColor(accentColor, 20),
    '--accent-color-text': getContrastingTextColor(accentColor),
  };
}

/**
 * Validates if a string is a valid hex color
 */
export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}
