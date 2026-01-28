'use server';

import { revalidatePath } from 'next/cache';

/**
 * Server action to revalidate store pages after updates
 */
export async function revalidateStorePage(subdomain: string, locale?: string) {
  // Revalidate the main store page
  revalidatePath(`/store/${subdomain}`, 'layout');
  
  // Also revalidate with locale if provided
  if (locale) {
    revalidatePath(`/store/${subdomain}/${locale}`, 'layout');
  }
}
