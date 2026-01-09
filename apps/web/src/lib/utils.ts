/**
 * Extracts the first Latin (A-Z, a-z) character from a string.
 * Used for avatar initials to ensure they display correctly
 * regardless of whether the text is in Georgian or English.
 *
 * @param text - The input string
 * @param fallback - Fallback character if no Latin character found (default: 'S')
 * @returns The first Latin character (uppercase) or fallback - NEVER returns non-Latin characters
 */
export function getLatinInitial(
  text: string | undefined | null,
  fallback = 'S'
): string {
  if (!text || text.length === 0) return fallback;

  // Find first Latin character (A-Z or a-z)
  const latinMatch = text.match(/[A-Za-z]/);

  if (latinMatch) {
    return latinMatch[0].toUpperCase();
  }

  // If no Latin character found, return the fallback (never Georgian chars)
  return fallback;
}

/**
 * Gets initials from first and last name, preferring Latin characters.
 *
 * @param firstName - First name
 * @param lastName - Last name
 * @param email - Email as fallback
 * @returns Two-letter initials (uppercase)
 */
export function getUserInitials(
  firstName: string | undefined | null,
  lastName: string | undefined | null,
  email?: string
): string {
  const first = getLatinInitial(firstName, '');
  const last = getLatinInitial(lastName, '');

  if (first || last) {
    return (first + last).toUpperCase();
  }

  // Fallback to email
  if (email) {
    return getLatinInitial(email, 'U');
  }

  return 'U';
}

