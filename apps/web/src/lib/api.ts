// Build API base URL - strip any existing prefix to avoid duplication
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export const apiUrl = `${API_URL}/api/v1`;

function buildUrl(path: string): string {
  if (path.startsWith('http')) return path;
  if (path.startsWith('/api/')) return `${API_URL}${path}`;
  return `${apiUrl}${path}`;
}

/**
 * Track if we're currently refreshing the token to prevent multiple refresh attempts
 */
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Make a fetch request with automatic token refresh on 401
 */
async function fetchWithRefresh(
  url: string,
  options: RequestInit,
  retried = false,
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
  });

  // If we get 401 and haven't retried yet, try to refresh the token
  if (response.status === 401 && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry the original request
      return fetchWithRefresh(url, options, true);
    }
  }

  return response;
}

/**
 * API helper for making authenticated requests from client components
 * Automatically refreshes access token on 401 and retries the request
 */
export const api = {
  /**
   * GET request with credentials
   */
  async get<T = any>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetchWithRefresh(buildUrl(path), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw { ...error, status: response.status };
    }

    return response.json();
  },

  /**
   * POST request with credentials
   */
  async post<T = any>(
    path: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetchWithRefresh(buildUrl(path), {
      method: 'POST',
      headers: isFormData
        ? {
            ...options?.headers,
          }
        : {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
      body: isFormData ? (body as BodyInit) : body ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw { ...error, status: response.status };
    }

    return response.json();
  },

  /**
   * PUT request with credentials
   */
  async put<T = any>(
    path: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetchWithRefresh(buildUrl(path), {
      method: 'PUT',
      headers: isFormData
        ? {
            ...options?.headers,
          }
        : {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
      body: isFormData ? (body as BodyInit) : body ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw { ...error, status: response.status };
    }

    return response.json();
  },

  /**
   * PATCH request with credentials
   */
  async patch<T = any>(
    path: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    
    // For FormData, we must NOT set Content-Type - browser will set it with boundary
    const headers = isFormData ? undefined : {
      'Content-Type': 'application/json',
      ...options?.headers,
    };
    
    const response = await fetchWithRefresh(buildUrl(path), {
      method: 'PATCH',
      headers,
      body: isFormData ? (body as BodyInit) : body ? JSON.stringify(body) : undefined,
      ...options,
      // Ensure headers from options don't override for FormData
      ...(isFormData ? { headers: undefined } : {}),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw { ...error, status: response.status };
    }

    return response.json();
  },

  /**
   * DELETE request with credentials
   */
  async delete<T = any>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetchWithRefresh(buildUrl(path), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw { ...error, status: response.status };
    }

    return response.json();
  },
};

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
      next: { 
        revalidate: 60, // Cache for 60 seconds
        tags: [`store-${subdomain}`], // Tag for targeted revalidation
      },
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
        next: { 
          revalidate: 60, // Cache for 60 seconds
          tags: [`store-${subdomain}`], // Tag for targeted revalidation
        },
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
