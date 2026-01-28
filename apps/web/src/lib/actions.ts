'use server';

import { revalidatePath } from 'next/cache';

/**
 * Server action to revalidate store pages after updates
 */
export async function revalidateStorePage(subdomain: string, locale?: string) {
  // Revalidate all paths for this store
  revalidatePath(`/store/${subdomain}`, 'layout');
  
  // Also revalidate with locale if provided
  if (locale) {
    revalidatePath(`/store/${subdomain}/${locale}`, 'layout');
    revalidatePath(`/store/${subdomain}/${locale}`, 'page');
  }
  
  // Revalidate the root path as well
  revalidatePath('/', 'layout');
}
