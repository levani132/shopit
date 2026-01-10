// Build API base URL - strip any existing prefix to avoid duplication
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export const apiUrl = `${API_URL}/api/v1`;

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface LocalizedText {
  ka?: string;
  en?: string;
}

export interface StoreData {
  id: string;
  subdomain: string;
  name: string;
  nameLocalized?: LocalizedText;
  description?: string;
  descriptionLocalized?: LocalizedText;
  logo?: string;
  coverImage?: string;
  useDefaultCover: boolean;
  brandColor: string;
  accentColor: string;
  useInitialAsLogo: boolean;
  authorName?: string;
  authorNameLocalized?: LocalizedText;
  showAuthorName: boolean;
  categories: string[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  phone?: string;
  email?: string;
  address?: string;
  isVerified: boolean;
  homepageProductOrder?: string;
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

export interface SubcategoryData {
  _id: string;
  name: string;
  nameLocalized?: LocalizedText;
  slug: string;
  order: number;
}

export interface CategoryData {
  _id: string;
  name: string;
  nameLocalized?: LocalizedText;
  slug: string;
  order: number;
  storeId: string;
  subcategories: SubcategoryData[];
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
    const response = await fetch(`${apiUrl}/auth/check-subdomain/${subdomain}`);

    if (!response.ok) {
      throw new Error(`Failed to check subdomain: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error checking subdomain:', error);
    return { available: false, reason: 'error' };
  }
}

/**
 * Fetch categories for a store by storeId
 */
export async function getCategoriesByStoreId(
  storeId: string,
): Promise<CategoryData[]> {
  try {
    const response = await fetch(`${apiUrl}/categories/store/${storeId}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export interface HomepageProduct {
  _id: string;
  name: string;
  nameLocalized?: LocalizedText;
  description?: string;
  descriptionLocalized?: LocalizedText;
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  images: string[];
  stock: number;
  totalStock?: number; // For products with variants
  hasVariants?: boolean;
  variants?: unknown[]; // Used to calculate variantsCount
  categoryId?: { name: string; nameLocalized?: LocalizedText };
}

export interface HomepageProductsResponse {
  products: HomepageProduct[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Fetch homepage products for a store
 */
export async function getHomepageProducts(
  storeId: string,
  order = 'popular',
  limit = 8,
): Promise<HomepageProductsResponse> {
  try {
    const response = await fetch(
      `${apiUrl}/products/store/${storeId}/homepage?order=${order}&limit=${limit}`,
      {
        next: { revalidate: 30 }, // Cache for 30 seconds for slight dynamism
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch homepage products: ${response.statusText}`,
      );
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching homepage products:', error);
    return { products: [], totalCount: 0, hasMore: false };
  }
}
