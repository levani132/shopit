# Project Structure

## Overview

This is an Nx monorepo with:
- **apps/** - Deployable applications
- **libs/** - Shared libraries

## Apps

### `apps/web` (Next.js 16 + React 19)
Frontend application.

Key directories:
```
src/
├── app/                    # Next.js App Router pages
│   ├── [locale]/          # Main site pages (shopit.ge)
│   │   ├── login/
│   │   ├── register/
│   │   ├── dashboard/
│   │   └── page.tsx       # Homepage
│   ├── store/             # Store subdomain pages
│   │   └── [subdomain]/
│   │       └── [locale]/
│   │           ├── login/
│   │           ├── register/
│   │           └── page.tsx
│   └── global.css
├── components/
│   ├── auth/              # Auth-related (ProtectedRoute)
│   ├── dashboard/         # Dashboard components
│   ├── home/              # Homepage sections
│   ├── layout/            # Header, Footer, ConditionalLayout
│   ├── register/          # Multi-step registration
│   ├── store/             # StoreHeader, StoreFooter
│   ├── theme/             # ThemeProvider, AccentColorProvider
│   └── ui/                # Reusable UI (ShopItLogo, etc.)
├── contexts/              # React contexts (AuthContext)
├── data/                  # Mock data for development
├── hooks/                 # Custom hooks
├── i18n/                  # Internationalization
└── lib/                   # Utilities, API helpers
```

### `apps/api` (NestJS)
Backend API.

Key directories:
```
src/
├── auth/                  # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   ├── guards/
│   └── strategies/
├── stores/                # Store management
├── products/              # Product management
├── upload/                # File uploads (S3)
└── main.ts               # App bootstrap, CORS config
```

## Shared Libraries

### `@sellit/constants`
Path: `libs/shared/constants/`

Contains:
- `ACCENT_COLORS`, `STORE_BRAND_COLORS`, `MAIN_SITE_ACCENT_COLORS`
- App-wide constants (limits, routes, etc.)
- Error constants

### `@sellit/types`
Path: `libs/shared/types/`

TypeScript interfaces for:
- User, Store, Product, Post, etc.

### `@sellit/validators`
Path: `libs/shared/validators/`

Shared validation functions.

### `@sellit/database`
Path: `libs/api/database/`

Mongoose schemas:
- `user.schema.ts`
- `store.schema.ts`
- `product.schema.ts`
- etc.

## Nx Commands

```bash
# Run dev server
npx nx serve web
npx nx serve api

# Build
npx nx build web
npx nx build api

# Build a library
npx nx build constants

# Clear cache
rm -rf .next .turbo .nx/cache node_modules/.cache
```

## Environment Variables

### API (`apps/api/.env`)
```
MONGODB_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Web (`apps/web/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## Package Imports

Libraries are imported by their package name:
```typescript
import { ACCENT_COLORS } from '@sellit/constants';
import { User } from '@sellit/types';
```

The mapping is handled by Nx through `tsconfig.json` paths and `package.json` exports.

