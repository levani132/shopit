/**
 * Authentication type definitions
 */

import { UserRole } from './user.types';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
  tokens: AuthTokens;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenValidationResult {
  valid: boolean;
  expired: boolean;
  payload?: JwtPayload;
}
