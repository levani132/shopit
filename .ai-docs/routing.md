# URL Routing Structure

## Overview

The app has two main routing contexts:
1. **Main Site** (`shopit.ge`) - Marketing pages, seller registration, dashboard
2. **Store Subdomains** (`mystore.shopit.ge`) - Individual store fronts

## Main Site Routes

Located in: `apps/web/src/app/[locale]/`

```
/                    - Homepage
/login               - Login page
/register            - Seller registration (multi-step)
/register/buyer      - Buyer registration (simple)
/dashboard           - Seller dashboard
/dashboard/store     - Store settings
/dashboard/products  - Product management
/dashboard/orders    - Order management
```

## Store Subdomain Routes

Located in: `apps/web/src/app/store/[subdomain]/[locale]/`

```
/                    - Store homepage
/products            - All products
/products/[id]       - Product detail
/posts               - Blog/social posts
/posts/[id]          - Post detail
/info                - Store info pages
/login               - Store-branded login
/register            - Store-branded buyer registration
```

## How Subdomains Work

### Middleware Detection

File: `apps/web/src/middleware.ts`

The middleware detects subdomains and rewrites URLs:
```typescript
// mystore.shopit.ge/products → /store/mystore/en/products
```

### Store Layout

File: `apps/web/src/app/store/[subdomain]/[locale]/layout.tsx`

- Fetches store data from API
- Sets store accent color CSS variables
- Renders StoreHeader and StoreFooter

### Navigation Rules

From any store subdomain page:
- **Logo** → Links to main site (`https://shopit.ge`)
- **"Create Your Shop"** → Links to main site registration
- **Login** → Store's login page (keeps store branding)
- **Register** → Store's buyer registration (keeps store branding)

## Getting Store Data

### From API
```typescript
import { getStoreBySubdomain } from '@/lib/api';
const store = await getStoreBySubdomain('mystore');
```

### From Mock (fallback)
```typescript
import { getStoreBySubdomain } from '@/data/mock-stores';
const store = getStoreBySubdomain('mystore');
```

## Login/Register on Store Subdomain

When a user logs in or registers from a store subdomain:
1. The page detects it's on a subdomain
2. Fetches store info to get brand colors
3. Applies store accent colors to the form
4. After success, redirects back to the store (not main site)

Files:
- `apps/web/src/app/store/[subdomain]/[locale]/login/page.tsx`
- `apps/web/src/app/store/[subdomain]/[locale]/register/page.tsx`

## i18n (Internationalization)

Supported locales: `en`, `ka` (Georgian)

All routes include locale: `/en/products`, `/ka/products`

Configuration: `apps/web/src/i18n/routing.ts`

