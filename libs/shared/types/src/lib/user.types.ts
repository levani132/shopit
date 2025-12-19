/**
 * User-related type definitions
 */

export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  STORE_OWNER = 'STORE_OWNER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
