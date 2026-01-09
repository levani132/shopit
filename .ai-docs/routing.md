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
/login               - Store-branded login (no header/footer)
/register            - Store-branded buyer registration (no header/footer)
```

### Auth Pages (No Header/Footer)

Auth pages (`/login`, `/register`) don't show header/footer.

Located in: `apps/web/src/app/store/[subdomain]/[locale]/(auth)/`

The header/footer visibility is handled by a **client component** that uses
`usePathname()` to detect the current route:

File: `apps/web/src/components/store/StoreLayoutContent.tsx`

```typescript
'use client';
import { usePathname } from 'next/navigation';

const AUTH_ROUTES = ['/login', '/register'];

export function StoreLayoutContent({ children, store, accentColors }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname?.endsWith(route));

  return (
    <div style={accentColors}>
      {!isAuthRoute && <StoreHeader store={store} />}
      <main>{children}</main>
      {!isAuthRoute && <StoreFooter store={store} />}
    </div>
  );
}
```

**IMPORTANT**: We use a client component with `usePathname()` instead of server-side
headers because server layouts don't re-render on client-side navigation. This ensures
header/footer appear correctly after login redirects.

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
- **Seller Dashboard** → Links to main site with locale (`https://shopit.ge/en/dashboard`)

### Getting Main Site URL

The `getMainSiteUrl()` function in `StoreHeader.tsx` computes the main site URL from the current subdomain:

```typescript
// sample.localhost:3000 → http://localhost:3000
// mystore.shopit.ge → https://shopit.ge
// localhost → "" (empty, stays relative)
```

Dashboard links include the locale: `${mainSiteUrl}/${locale}/dashboard`

The locale is obtained from `useParams()` which reads from the URL path.

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

1. Middleware sets `x-pathname` header for route detection
2. Store layout detects auth route and hides header/footer
3. The page fetches store info to get brand colors
4. Applies store accent colors to the form
5. After success, redirects back to the store (not main site)

Files:

- `apps/web/src/app/store/[subdomain]/[locale]/layout.tsx` - Conditionally hides header/footer
- `apps/web/src/app/store/[subdomain]/[locale]/(auth)/login/page.tsx`
- `apps/web/src/app/store/[subdomain]/[locale]/(auth)/register/page.tsx`

## i18n (Internationalization)

Supported locales: `en`, `ka` (Georgian)

All routes include locale: `/en/products`, `/ka/products`

Configuration: `apps/web/src/i18n/routing.ts`
