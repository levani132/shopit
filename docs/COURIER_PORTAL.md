# Courier Portal Documentation

## Overview

The Courier Portal (`couriers.shopit.ge`) is a dedicated platform for ShopIt delivery couriers to register, view available orders, and manage deliveries.

## Portal URL

- **Production**: `https://couriers.shopit.ge`
- **Development**: `http://couriers.localhost:3000`

The `couriers` subdomain is reserved and cannot be used as a store subdomain.

## Landing Page

The landing page (`/couriers/[locale]/page.tsx`) includes:

1. **Hero Section**: Call to action for becoming a courier
2. **Stats Section**: Platform statistics (stores, deliveries, earnings)
3. **How It Works**: 3-step process explanation
   - Become a Partner
   - See Active Orders
   - Get Paid
4. **Benefits Section**: Why deliver with ShopIt
5. **CTA Section**: Final call to action

## User Flows

### New User Registration

1. User visits `couriers.shopit.ge`
2. Clicks "Register" or "Become a Courier"
3. Creates account with standard registration
4. Redirected to courier application form
5. Submits required information
6. Awaits admin approval

### Existing User Application

1. User visits `couriers.shopit.ge`
2. Logs in with existing account
3. Clicks "Apply Now"
4. Fills out courier application form
5. Submits required information
6. Awaits admin approval

### Approved Courier

1. User visits `couriers.shopit.ge`
2. Logs in
3. Sees "Go to Dashboard" button
4. Accesses courier dashboard with delivery orders

## Courier Application Requirements

| Field                 | Required | Description                          |
| --------------------- | -------- | ------------------------------------ |
| `phoneNumber`         | Yes      | Contact number                       |
| `identificationNumber`| Yes      | Georgian personal ID (11 digits)     |
| `accountNumber`       | Yes      | Bank account (IBAN) for payouts      |
| `beneficiaryBankCode` | No       | SWIFT/BIC code (default: BAGAGE22)   |
| `vehicleType`         | No       | car, motorcycle, bicycle, walking    |
| `workingAreas`        | No       | Regions/cities for deliveries        |

## API Endpoints

### Application

```
POST /api/v1/auth/courier/apply
Body: {
  phoneNumber: string,
  identificationNumber: string,
  accountNumber: string,
  beneficiaryBankCode?: string,
  vehicleType?: string,
  workingAreas?: string[]
}

GET /api/v1/auth/courier/status
Response: {
  isCourier: boolean,
  isApproved: boolean,
  appliedAt?: Date,
  approvedAt?: Date
}
```

### Order Management

```
GET /api/v1/orders/courier/available
// Returns orders with status READY_FOR_DELIVERY

GET /api/v1/orders/courier/my-orders
// Returns orders assigned to current courier

PATCH /api/v1/orders/:id/assign-courier
// Courier claims an order

PATCH /api/v1/orders/:id/courier-status
Body: { status: 'shipped' | 'delivered' }
// Courier updates order status
```

## Middleware Configuration

The middleware (`apps/web/src/middleware.ts`) handles the `couriers` subdomain specially:

```typescript
if (subdomain === 'couriers') {
  // Route to /couriers/[locale]/... pages
  url.pathname = `/couriers/${locale}${restPath}`;
  return NextResponse.rewrite(url);
}
```

## File Structure

```
apps/web/src/app/couriers/
├── [locale]/
│   ├── layout.tsx      # Courier portal layout
│   ├── page.tsx        # Landing page
│   ├── login/          # Login page (future)
│   ├── register/       # Registration page (future)
│   ├── apply/          # Application form (future)
│   └── dashboard/      # Courier dashboard (future)
```

## Translations

Courier-specific translations are in the `courier` namespace:

- `apps/web/src/messages/en.json` → `courier.*`
- `apps/web/src/messages/ka.json` → `courier.*`

See the `courier` section for all available translation keys.

## Related Documentation

- [DELIVERY.md](./DELIVERY.md) - Delivery system documentation
- [ORDERS.md](./ORDERS.md) - Order management documentation

