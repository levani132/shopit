# Development Guide

## 🚨 CRITICAL: API Request Guidelines

### ⚠️ NEVER use raw `fetch()` for authenticated API calls

**Always use the centralized API client** from `/apps/web/src/lib/api.ts`

### Why?

The centralized API client provides:

- ✅ **Automatic token refresh** on 401 responses
- ✅ **Automatic JSON parsing** of responses
- ✅ **Proper error handling** with status codes
- ✅ **Race condition prevention** for concurrent refresh attempts
- ✅ **Automatic credentials inclusion** (httpOnly cookies)

### ❌ WRONG - DO NOT DO THIS:

```typescript
// ❌ BAD - No automatic token refresh
const response = await fetch(`${API_URL}/api/v1/orders`, {
  credentials: 'include',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
const result = await response.json();
```

### ✅ CORRECT - DO THIS:

```typescript
// ✅ GOOD - Automatic token refresh and error handling
import { api } from '@/lib/api'; // or relative path to lib/api

const result = await api.post('/api/v1/orders', data);
```

## API Client Methods

```typescript
// GET request
const data = await api.get<ReturnType>('/api/v1/endpoint');

// POST request
const result = await api.post<ReturnType>('/api/v1/endpoint', { body: 'data' });

// PUT request
const result = await api.put<ReturnType>('/api/v1/endpoint', { body: 'data' });

// PATCH request
const result = await api.patch<ReturnType>('/api/v1/endpoint', {
  body: 'data',
});

// DELETE request
const result = await api.delete<ReturnType>('/api/v1/endpoint');
```

## Error Handling

The API client automatically throws errors for non-OK responses:

```typescript
try {
  const result = await api.post('/api/v1/orders', orderData);
  // Handle success
  setOrder(result);
} catch (err) {
  // Error includes status code and message
  const errorMessage =
    err && typeof err === 'object' && 'message' in err
      ? String(err.message)
      : 'Request failed';
  setError(errorMessage);
}
```

## When Can You Use Raw `fetch()`?

**Only in these specific cases:**

1. **Server-side data fetching** (SSR/SSG) - When using Next.js `fetch` with caching
2. **Public endpoints** that don't require authentication
3. **Inside the API client itself** (`/apps/web/src/lib/api.ts`)
4. **Proxy routes** that handle their own authentication

### Example - Public Endpoint (OK to use fetch):

```typescript
// ✅ OK - Public endpoint, no auth needed, using Next.js fetch caching
export async function getStoreBySubdomain(subdomain: string) {
  const response = await fetch(`${apiUrl}/stores/subdomain/${subdomain}`, {
    next: { revalidate: 60 }, // Next.js specific caching
  });
  return response.json();
}
```

### Example - Authenticated Endpoint (MUST use api client):

```typescript
// ✅ CORRECT
async function fetchMyOrders() {
  const orders = await api.get('/api/v1/orders/my-orders');
  setOrders(orders);
}
```

## Migration Checklist

If you find raw `fetch()` calls in the codebase:

- [ ] Is this an authenticated endpoint? → **Use `api` client**
- [ ] Does it need credentials/cookies? → **Use `api` client**
- [ ] Is it in a client component? → **Use `api` client**
- [ ] Could it return 401 when token expires? → **Use `api` client**

## Common Patterns

### Fetching data on mount:

```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await api.get('/api/v1/endpoint');
      setData(data);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  fetchData();
}, []);
```

### Form submission:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const result = await api.post('/api/v1/endpoint', formData);
    setSuccess(true);
  } catch (err) {
    const errorMessage =
      err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Submission failed';
    setError(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
};
```

### Parallel requests:

```typescript
const [data1, data2, data3] = await Promise.all([
  api.get('/api/v1/endpoint1'),
  api.get('/api/v1/endpoint2'),
  api.get('/api/v1/endpoint3'),
]);
```

## Remember

**Every time you're about to use `fetch()` for an API call, ask yourself:**

> "Should this use the centralized API client instead?"

**The answer is YES 99% of the time!**

## Related Documentation

- [PWA Implementation](./PWA.md) - Multi-tenant PWA, service workers, manifest configuration
- [Components](./COMPONENTS.md) - Shared component documentation

## Shared Components

### UserMenuDropdown

A single shared user menu component used across all headers:

**Location**: `apps/web/src/components/ui/UserMenuDropdown.tsx`

**Used In**:

- `Header.tsx` - Main site header
- `ShopItBar.tsx` - Store subdomain header
- `DashboardHeader.tsx` - Dashboard header

**Features**:

- Role-based menu sections (User, Seller, Courier, Courier Admin, Admin)
- Color-coded role badges (cyan for courier admin, purple for seller/admin, blue for courier)
- Impersonation support with "Return as Admin" button
- Consistent across all pages

**Props**:

```typescript
interface UserMenuDropdownProps {
  locale: string;
  dashboardBaseUrl?: string; // For cross-origin navigation from stores
  showWishlist?: boolean; // Show wishlist link
  showViewStore?: boolean; // Show "View My Store" link
  variant?: 'default' | 'store'; // Use store accent colors
}
```

## User Roles & Impersonation

### Role Bitmask Values

```typescript
// libs/shared/constants/src/lib/roles.ts
export enum Role {
  USER = 1,
  COURIER = 2,
  SELLER = 4,
  ADMIN = 8,
  COURIER_ADMIN = 16,
}

// Check role with hasRole() function
import { hasRole, Role } from '@shopit/constants';
if (hasRole(user.role, Role.COURIER_ADMIN)) { ... }
```

### Impersonation

Admins and Courier Admins can impersonate users for testing/support:

```typescript
// Frontend - AuthContext
const { impersonateUser, stopImpersonation, isImpersonating } = useAuth();

// Start impersonation (navigates and refreshes page)
await impersonateUser(userId);

// Stop impersonation (returns to admin session)
await stopImpersonation();

// Check if currently impersonating
if (isImpersonating) {
  // Show "Return as Admin" button
}
```

**localStorage Keys**:

- `impersonating`: Boolean flag set during impersonation

**Impersonation Rules**:

- `ADMIN` can impersonate any user
- `COURIER_ADMIN` can ONLY impersonate `COURIER` users
- JWT includes `impersonatedBy` claim for session tracking

## Shared Constants

Use `@shopit/constants` for shared constants across frontend and backend:

```typescript
import {
  ACCENT_COLORS,
  DEFAULT_ACCENT_COLOR_NAME,
  STORE_BRAND_COLORS,
  AccentColorName,
} from '@shopit/constants';

// Default accent color (blue)
const defaultColor = DEFAULT_ACCENT_COLOR_NAME; // 'blue'

// Get color palette
const blueColors = ACCENT_COLORS.blue; // { 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' }

// Full shade palette for stores
const fullPalette = STORE_BRAND_COLORS.blue; // { 50, 100, 200, ..., 900 }
```

### Available Accent Colors

Colors with pre-generated icons: `blue`, `rose`, `green`, `purple`, `orange`, `indigo`, `black`

See [PWA Documentation](./PWA.md) for icon color mapping.
