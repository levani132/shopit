# API Client Migration Tracker

## Status

This document tracks the migration from raw `fetch()` calls to the centralized `api` client.

### Priority Legend
- 🔴 **HIGH** - Authenticated endpoints, critical user flows
- 🟡 **MEDIUM** - Less frequent flows, admin pages
- 🟢 **LOW** - Public endpoints, can use fetch with caching

---

## ✅ Completed Migrations

- [x] `/apps/web/src/app/[locale]/dashboard/routes/page.tsx` - Route management
- [x] `/apps/web/src/app/[locale]/dashboard/deliveries/page.tsx` - Deliveries
- [x] `/apps/web/src/app/[locale]/dashboard/courier-analytics/page.tsx` - Analytics
- [x] `/apps/web/src/contexts/AuthContext.tsx` - Authentication context
- [x] `/apps/web/src/app/[locale]/contact/page.tsx` - Contact form

---

## 🔴 HIGH Priority (Needs Immediate Fix)

### Dashboard - Core Features
- [ ] `/apps/web/src/app/[locale]/dashboard/addresses/page.tsx` (4 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/devices/page.tsx` (3 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/notifications/page.tsx` (4 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/wishlist/page.tsx` (2 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/profile/page.tsx` (6 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/my-orders/page.tsx` (1 fetch call)

### Auth & Registration
- [ ] `/apps/web/src/app/[locale]/register/buyer/page.tsx` (1 fetch call)
- [ ] `/apps/web/src/app/store/[subdomain]/[locale]/(auth)/register/page.tsx` (1 fetch call)
- [ ] `/apps/web/src/app/couriers/[locale]/apply/page.tsx` (2 fetch calls)
- [ ] `/apps/web/src/components/register/ProfileCompletion.tsx` (1 fetch call)
- [ ] `/apps/web/src/components/register/steps/Step3Auth.tsx` (2 fetch calls)

### Store Frontend - Checkout & Orders
- [ ] `/apps/web/src/app/store/[subdomain]/[locale]/(main)/checkout/page.tsx` (7 fetch calls)
- [ ] `/apps/web/src/app/store/[subdomain]/[locale]/(main)/orders/page.tsx` (3 fetch calls)
- [ ] `/apps/web/src/app/store/[subdomain]/[locale]/(main)/wishlist/page.tsx` (2 fetch calls)

### Seller Dashboard - Products & Orders
- [ ] `/apps/web/src/app/[locale]/dashboard/products/page.tsx` (2 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/products/new/page.tsx` (3 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/products/[id]/page.tsx` (5 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/orders/page.tsx` (3 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/categories/page.tsx` (7 fetch calls)

### Seller Dashboard - Store & Balance
- [ ] `/apps/web/src/app/[locale]/dashboard/store/page.tsx` (5 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/balance/page.tsx` (4 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/courier-balance/page.tsx` (3 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/attributes/page.tsx` (3 fetch calls)

---

## 🟡 MEDIUM Priority

### Dashboard Components
- [ ] `/apps/web/src/components/dashboard/VariantEditor.tsx` (1 fetch call)
- [ ] `/apps/web/src/components/store/ProductCard.tsx` (2 fetch calls)

### Admin Settings
- [ ] `/apps/web/src/app/[locale]/dashboard/admin/route-comparison/page.tsx` (2 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/admin/settings/faq/page.tsx` (4 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/admin/settings/contact/page.tsx` (2 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/admin/settings/terms/page.tsx` (2 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/admin/settings/privacy/page.tsx` (2 fetch calls)
- [ ] `/apps/web/src/app/[locale]/dashboard/admin/settings/about/page.tsx` (2 fetch calls)

### Notifications
- [ ] `/apps/web/src/app/[locale]/dashboard/notifications/settings/page.tsx` (2 fetch calls)

### Main Dashboard
- [ ] `/apps/web/src/app/[locale]/dashboard/page.tsx` (4 fetch calls in Promise.all)

---

## 🟢 LOW Priority (OK to keep `fetch` with caching)

### Public Content Pages (Server-side, no auth)
- `/apps/web/src/app/[locale]/about/page.tsx` - Public content
- `/apps/web/src/app/[locale]/terms/page.tsx` - Public content  
- `/apps/web/src/app/[locale]/privacy/page.tsx` - Public content
- `/apps/web/src/app/[locale]/faq/page.tsx` - Public content
- `/apps/web/src/app/[locale]/pricing/page.tsx` - Public settings

### Store Public Pages (Server-side, no auth)
- `/apps/web/src/app/store/[subdomain]/[locale]/(main)/about/page.tsx` - Public content
- `/apps/web/src/app/store/[subdomain]/[locale]/(main)/products/page.tsx` - Public products (some auth calls need fixing)
- `/apps/web/src/app/store/[subdomain]/[locale]/(main)/products/[id]/page.tsx` - Public product details (some auth calls need fixing)

### API Utilities (Intentionally using fetch)
- `/apps/web/src/lib/api.ts` - The API client itself
- `/apps/web/src/proxy.ts` - Proxy handling

---

## Migration Guidelines

When migrating a file:

1. Add `import { api } from '@/lib/api'` (adjust path)
2. Replace `fetch()` with appropriate `api.method()`
3. Remove manual JSON parsing (`await response.json()`)
4. Remove manual response.ok checks
5. Update error handling to catch thrown errors
6. Remove unused API_URL constants if no longer needed
7. Test the page thoroughly

### Before:
```typescript
const response = await fetch(`${API_URL}/api/v1/endpoint`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
if (response.ok) {
  const result = await response.json();
  // handle success
} else {
  // handle error
}
```

### After:
```typescript
try {
  const result = await api.post('/api/v1/endpoint', data);
  // handle success
} catch (err) {
  const errorMessage = err && typeof err === 'object' && 'message' in err 
    ? String(err.message) 
    : 'Request failed';
  // handle error
}
```

---

## Progress

- ✅ Completed: 5 files
- 🔴 High Priority Remaining: ~30 files
- 🟡 Medium Priority Remaining: ~10 files
- 🟢 Low Priority: ~10 files (OK to leave as-is)

**Estimated Total**: ~40-45 files need migration
