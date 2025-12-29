const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || 'api/v1';

export const apiUrl = `${API_URL}/${API_PREFIX}`;

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface StoreData {
  id: string;
  subdomain: string;
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  useDefaultCover: boolean;
  brandColor: string;
  accentColor: string;
  useInitialAsLogo: boolean;
  authorName?: string;
  showAuthorName: boolean;
  categories: string[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  phone?: string;
  address?: string;
  isVerified: boolean;
}

export interface ProductData {
  id: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category?: string;
  inStock: boolean;
}

export interface StoreWithProducts {
  store: StoreData;
  products: ProductData[];
}

/**
 * Fetch store data by subdomain
 */
export async function getStoreBySubdomain(
  subdomain: string,
): Promise<StoreData | null> {
  try {
    const response = await fetch(`${apiUrl}/stores/subdomain/${subdomain}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch store: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching store:', error);
    return null;
  }
}

/**
 * Fetch store with products by subdomain
 */
export async function getStoreWithProducts(
  subdomain: string,
): Promise<StoreWithProducts | null> {
  try {
    const response = await fetch(
      `${apiUrl}/stores/subdomain/${subdomain}/full`,
      {
        next: { revalidate: 60 }, // Cache for 60 seconds
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch store: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching store with products:', error);
    return null;
  }
}

/**
 * Check if subdomain is available
 */
export async function checkSubdomainAvailability(
  subdomain: string,
): Promise<{ available: boolean; reason?: string }> {
  try {
    const response = await fetch(
      `${apiUrl}/auth/check-subdomain/${subdomain}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to check subdomain: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error checking subdomain:', error);
    return { available: false, reason: 'error' };
  }
}

