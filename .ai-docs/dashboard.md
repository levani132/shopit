# Seller Dashboard

## Overview

The seller dashboard is where sellers manage their store, products, orders, and view analytics.

**Location**: `apps/web/src/app/[locale]/dashboard/`

## Authentication

The dashboard is protected by `SellerProtectedRoute` which:
- Redirects unauthenticated users to `/login`
- Redirects non-sellers (buyers) to `/`
- Only allows `SELLER` and `ADMIN` roles

## Theming

The dashboard uses the seller's store brand color as its accent:

```typescript
// In layout.tsx
const { store } = useAuth();
const brandColor = (store?.brandColor || 'indigo') as AccentColorName;

useEffect(() => {
  const accentColors = getAccentColorCssVars(brandColor, '--accent');
  Object.entries(accentColors).forEach(([varName, value]) => {
    document.documentElement.style.setProperty(varName, value);
  });
}, [brandColor]);
```

**How It Works:**
1. Dashboard layout sets CSS variables on `document.documentElement.style`
2. `AccentColorProvider` (in `ClientProviders`) **skips** dashboard pages
3. This allows the dashboard to control its own accent colors

**AccentColorProvider Coordination:**
The `AccentColorProvider` checks `pathname?.includes('/dashboard')` and skips setting colors on dashboard pages. This prevents conflicts.

CSS variables available: `--accent-50` through `--accent-900`

## Layout Structure

```
┌─────────────────────────────────────────────────┐
│                DashboardHeader                   │
│  [☰ Burger] [Logo]              [Theme] [User ▼]│
├────────────────┬────────────────────────────────┤
│                │                                │
│  Dashboard     │                                │
│  Sidebar       │         Page Content           │
│  (hidden on    │                                │
│   mobile)      │                                │
│                │                                │
└────────────────┴────────────────────────────────┘
```

## Components

### DashboardHeader (`components/dashboard/DashboardHeader.tsx`)

- Logo link to homepage
- Burger menu (mobile only) - opens mobile nav
- Theme toggle button
- **User menu dropdown**:
  - User avatar with initials
  - Name, email, "Seller" badge
  - "View My Store" link
  - "Profile" link
  - **Logout** button

### DashboardSidebar (`components/dashboard/DashboardSidebar.tsx`)

- Hidden on mobile (shown in burger menu instead)
- Navigation items:
  - Overview (`/dashboard`)
  - Store Settings (`/dashboard/store`)
  - Products (`/dashboard/products`)
  - Categories (`/dashboard/categories`)
  - Orders (`/dashboard/orders`)
  - Analytics (`/dashboard/analytics`)
  - Profile (`/dashboard/profile`)

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/dashboard` | `page.tsx` | Overview with stats and quick actions |
| `/dashboard/store` | `store/page.tsx` | Store settings (bilingual, branding, contact, homepage product order) |
| `/dashboard/products` | `products/page.tsx` | Product list with sortable table |
| `/dashboard/products/new` | `products/new/page.tsx` | New product form |
| `/dashboard/products/[id]` | `products/[id]/page.tsx` | Edit product form |
| `/dashboard/categories` | `categories/page.tsx` | Category management |
| `/dashboard/orders` | `orders/page.tsx` | Order management |
| `/dashboard/analytics` | `analytics/page.tsx` | Sales analytics |
| `/dashboard/profile` | `profile/page.tsx` | User profile settings |

## Key Patterns

### Using Auth Context

```typescript
import { useAuth } from '../../../contexts/AuthContext';

function MyComponent() {
  const { user, store, logout } = useAuth();
  
  // user: { id, email, firstName, lastName, role }
  // store: { id, subdomain, name, brandColor, ... }
}
```

### Getting User Initials

```typescript
const getUserInitials = () => {
  if (!user) return 'U';
  const first = user.firstName?.charAt(0) || '';
  const last = user.lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || 'U';
};
```

### View Store Link

Store URLs follow the pattern: `https://${store.subdomain}.shopit.ge`

For localhost development: `http://${store.subdomain}.localhost:3000`

## Translations

Dashboard translations are in `nav` and `dashboard` namespaces:

```typescript
const t = useTranslations('dashboard');
const tNav = useTranslations('nav');

t('storeSettings')  // "Store Settings"
tNav('logout')      // "Logout"
```

## UI/UX Patterns

### Contrast & Accessibility

Use proper contrast for form elements in dark mode:

- **Checkbox labels**: `text-gray-700 dark:text-gray-200` (not `text-gray-600 dark:text-gray-400`)
- **Radio button selected state**: Use solid backgrounds like `bg-white dark:bg-zinc-800` instead of transparent accent overlays
- **Description text**: `text-gray-600 dark:text-gray-300` for better readability

### Sortable Tables

For sortable column headers:
```typescript
<th onClick={() => handleSort('field')} className="cursor-pointer group">
  <div className="flex items-center">
    Label
    <SortIndicator field="field" />
  </div>
</th>
```

## Files

- `apps/web/src/app/[locale]/dashboard/layout.tsx` - Main layout with auth + theming
- `apps/web/src/components/dashboard/DashboardHeader.tsx` - Header with user menu
- `apps/web/src/components/dashboard/DashboardSidebar.tsx` - Sidebar navigation
- `apps/web/src/components/auth/ProtectedRoute.tsx` - Auth guards

