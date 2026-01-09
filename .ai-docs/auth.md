# Authentication System

## Overview

The app uses JWT-based authentication with HTTP-only cookies for security.

## User Roles

```typescript
enum UserRole {
  ADMIN = 'admin',
  SELLER = 'seller',  // Store owners
  USER = 'user',      // Buyers/customers
}
```

## Token Types

1. **Access Token** - Short-lived (15min), stored in HTTP-only cookie `access_token`
2. **Refresh Token** - Long-lived (7 days), stored in HTTP-only cookie `refresh_token`
3. **Session Token** - For device tracking, stored in HTTP-only cookie `session_token`

## Backend Files

- `apps/api/src/auth/auth.service.ts` - Core auth logic
- `apps/api/src/auth/auth.controller.ts` - API endpoints
- `apps/api/src/auth/dto/register.dto.ts` - DTOs with validation
- `apps/api/src/auth/strategies/` - Passport strategies (local, jwt, google)
- `apps/api/src/auth/guards/` - Route guards (JwtAuthGuard, RolesGuard)

## API Endpoints

```
POST /auth/register          - Seller registration (with store creation)
POST /auth/register/buyer    - Buyer registration (USER role only)
POST /auth/login             - Email/password login
POST /auth/google            - Google OAuth initiation
GET  /auth/google/callback   - Google OAuth callback
POST /auth/refresh           - Refresh access token
POST /auth/logout            - Logout (clears cookies)
GET  /auth/me                - Get current user
```

## Frontend Files

- `apps/web/src/contexts/AuthContext.tsx` - Auth state management
- `apps/web/src/components/auth/ProtectedRoute.tsx` - Route protection components

## Registration Flow

### Seller Registration (multi-step)
1. Store name, subdomain, description
2. Logo, cover image, brand color
3. Email, password, author name

Files:
- `apps/web/src/components/register/` - Multi-step registration components
- `apps/web/src/app/[locale]/register/page.tsx` - Seller registration page

### Buyer Registration (simple)
- Just email, password, name
- Used when registering from a store subdomain

File: `apps/web/src/app/[locale]/register/buyer/page.tsx`

## Important: Boolean Fields in FormData

When sending FormData to the API, boolean values are sent as strings ("true"/"false").

The backend uses `@Transform` decorators to convert them:

```typescript
// In register.dto.ts
export const toBooleanTransform = ({ value }: { value: string | boolean }) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

@Transform(toBooleanTransform)
@IsBoolean()
useDefaultCover!: boolean;
```

## Cookie Configuration

```typescript
// In auth.service.ts
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  domain: '.shopit.ge', // Allows cookies across subdomains
};
```

## CORS Configuration

CORS is configured in `apps/api/src/main.ts` to allow:
- `shopit.ge`
- `*.shopit.ge` (all subdomains)
- `localhost:*` (development)

