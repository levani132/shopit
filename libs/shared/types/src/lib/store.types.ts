/**
 * Store-related type definitions
 */

export interface Store {
  id: string;
  subdomain: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  profileImage: string | null;
  accentColor: string;
  isActive: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoreDto {
  subdomain: string;
  name: string;
  description?: string;
  accentColor?: string;
}

export interface UpdateStoreDto {
  name?: string;
  description?: string;
  coverImage?: string;
  profileImage?: string;
  accentColor?: string;
  isActive?: boolean;
}

export interface StoreResponse {
  id: string;
  subdomain: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  profileImage: string | null;
  accentColor: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorePublicResponse extends StoreResponse {
  categoriesCount: number;
  productsCount: number;
  postsCount: number;
}

export interface StoreTheme {
  accentColor: string;
  accentColorLight: string;
  accentColorDark: string;
  coverImage: string | null;
  profileImage: string | null;
}
