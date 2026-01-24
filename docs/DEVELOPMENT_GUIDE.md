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
const result = await api.patch<ReturnType>('/api/v1/endpoint', { body: 'data' });

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
  const errorMessage = err && typeof err === 'object' && 'message' in err 
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
    const errorMessage = err && typeof err === 'object' && 'message' in err 
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
