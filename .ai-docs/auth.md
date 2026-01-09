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
POST /auth/create-store      - Create store for logged-in user (upgrades USER to SELLER)
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

**IMPORTANT**: `AuthProvider` must be in BOTH layouts:
- Main site: `apps/web/src/app/[locale]/layout.tsx` (via ClientProviders)
- Store: `apps/web/src/app/store/[subdomain]/[locale]/layout.tsx`

Without AuthProvider, `useAuth()` returns a default context with `isLoading: true` forever.

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

### Logged-in User Creating a Store

When a logged-in user (buyer) wants to create their own store:

1. They go through the normal multi-step registration flow (Steps 1-3)
2. **Step 2**: Author name is auto-populated from their account name
3. **Step 3**: Instead of email/password fields, shows their name and email with a "Register Now" button
4. Backend calls `POST /auth/create-store` instead of `POST /auth/register`
5. User role is upgraded from `USER` to `SELLER`

Key files:
- `apps/web/src/components/register/steps/Step2Details.tsx` - Auto-fills author name
- `apps/web/src/components/register/steps/Step3Auth.tsx` - Detects logged-in user, shows simplified UI
- `apps/api/src/auth/auth.service.ts` - `createStoreForUser()` method

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

## MongoDB ObjectId Queries

**IMPORTANT**: When querying by `ownerId` in the store collection, always convert the string to `ObjectId`:

```typescript
// WRONG - won't find the store
this.storeModel.findOne({ ownerId: userId });

// CORRECT - converts string to ObjectId
import { Types } from 'mongoose';
this.storeModel.findOne({ ownerId: new Types.ObjectId(userId) });
```

This applies to:
- `auth.service.ts` - `getStoreByOwnerId()` method
- `stores.service.ts` - `findByOwnerId()` method

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

## Main Site Header

The main site header (`apps/web/src/components/layout/Header.tsx`) is auth-aware:

### When logged out:
- Shows "Login" link
- Shows "Start for Free" CTA button

### When logged in as seller:
- Shows "Go to Dashboard" CTA button
- Shows user avatar with dropdown menu (HeaderUserMenu)

### When logged in as buyer:
- Shows "Start for Free" CTA button (to create their own store)
- Shows user avatar with dropdown menu

## Smart CTA Button

`apps/web/src/components/ui/CtaButton.tsx` is a reusable component that automatically shows:
- "Go to Dashboard" for logged-in sellers
- "Start for Free" for everyone else

Used in: Hero, Analytics, FeaturedStores, HowItWorks, PaymentMethods

```tsx
import { CtaButton } from '../ui/CtaButton';

// Usage
<CtaButton />
<CtaButton size="md" showArrow={false} />
```

## Store Header User Menu

When a user is logged in on a store subdomain, the header shows a user menu dropdown.

### Components
- `apps/web/src/components/store/UserMenu.tsx` - Dropdown menu component
- `apps/web/src/components/store/StoreHeader.tsx` - Integrates UserMenu

### Menu Items by Role

**All Users (buyers):**
- My Profile (`/profile`)
- My Orders (`/orders`) - scoped to current store
- Wishlist (`/wishlist`)
- Sign Out

**Sellers (also see buyer options):**
- Seller Dashboard (links to main site `/dashboard`)

### Key Points
- User account is shared across all stores (same auth cookies)
- Orders and cart are scoped to each store
- Sellers can browse and buy from other stores as buyers
- The `useAuth` hook provides `user`, `isAuthenticated`, and `isLoading`

