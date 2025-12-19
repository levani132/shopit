/**
 * Category and Subcategory type definitions
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  order: number;
  storeId: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  categoryId: string;
}

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  image?: string;
  order?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  image?: string;
  order?: number;
}

export interface CreateSubcategoryDto {
  name: string;
  slug?: string;
  order?: number;
}

export interface UpdateSubcategoryDto {
  name?: string;
  slug?: string;
  order?: number;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  order: number;
  productsCount: number;
}

export interface CategoryWithSubcategoriesResponse extends CategoryResponse {
  subcategories: SubcategoryResponse[];
}

export interface SubcategoryResponse {
  id: string;
  name: string;
  slug: string;
  order: number;
  productsCount: number;
}
