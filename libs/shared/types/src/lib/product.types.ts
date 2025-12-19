/**
 * Product-related type definitions
 */

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  isOnSale: boolean;
  images: string[];
  stock: number;
  isActive: boolean;
  storeId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  salePrice?: number;
  isOnSale?: boolean;
  images?: string[];
  stock?: number;
  categoryId?: string;
  subcategoryId?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  salePrice?: number;
  isOnSale?: boolean;
  images?: string[];
  stock?: number;
  isActive?: boolean;
  categoryId?: string;
  subcategoryId?: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  isOnSale: boolean;
  images: string[];
  stock: number;
  isActive: boolean;
  categoryId: string | null;
  subcategoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  products: ProductResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductFilters {
  categoryId?: string;
  subcategoryId?: string;
  isOnSale?: boolean;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
