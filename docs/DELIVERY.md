# Delivery System Documentation

## Overview

ShopIt supports two delivery methods for stores:

1. **ShopIt Delivery** (`courierType: 'shopit'`): Platform couriers handle delivery (+10 GEL per order)
2. **Self Delivery** (`courierType: 'seller'`): Sellers handle their own delivery with custom fees and timelines

## Store Delivery Settings

### Schema Fields

| Field              | Type    | Default   | Description                                      |
| ------------------ | ------- | --------- | ------------------------------------------------ |
| `courierType`      | string  | 'shopit'  | 'shopit' or 'seller'                             |
| `prepTimeMinDays`  | number  | 1         | Minimum days to prepare order                    |
| `prepTimeMaxDays`  | number  | 3         | Maximum days to prepare order                    |
| `deliveryMinDays`  | number  | -         | Minimum delivery days (seller delivery only)     |
| `deliveryMaxDays`  | number  | -         | Maximum delivery days (seller delivery only)     |
| `deliveryFee`      | number  | 0         | Delivery fee in GEL (seller delivery only)       |
| `freeDelivery`     | boolean | false     | Enable free delivery (overrides deliveryFee)     |

### API Endpoints

```
PATCH /api/v1/stores/me
Body: {
  courierType: 'shopit' | 'seller',
  prepTimeMinDays: number,
  prepTimeMaxDays: number,
  deliveryMinDays: number,    // Only for seller delivery
  deliveryMaxDays: number,    // Only for seller delivery
  deliveryFee: number,        // Only for seller delivery
  freeDelivery: boolean       // Only for seller delivery
}
```

## Order Status Flow

### ShopIt Delivery Flow

```
PENDING → PAID → PROCESSING → READY_FOR_DELIVERY → SHIPPED → DELIVERED
                     ↑                                  ↑
                  (Seller)                          (Courier)
```

- **Seller** can update: PAID ↔ PROCESSING ↔ READY_FOR_DELIVERY
- **Courier** can update: READY_FOR_DELIVERY → SHIPPED → DELIVERED

### Self Delivery Flow

```
PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
                     ↑            ↑          ↑
                  (Seller)    (Seller)   (Seller)
```

- **Seller** manages the entire flow

## Order Statuses

| Status               | Description                                | Visible to Customer As |
| -------------------- | ------------------------------------------ | ---------------------- |
| `pending`            | Awaiting payment                           | Pending                |
| `paid`               | Payment confirmed                          | Paid                   |
| `processing`         | Seller preparing order                     | Processing             |
| `ready_for_delivery` | Ready for ShopIt courier pickup            | Processing             |
| `shipped`            | Order in transit                           | Shipped                |
| `delivered`          | Order delivered                            | Delivered              |
| `cancelled`          | Order cancelled                            | Cancelled              |
| `refunded`           | Order refunded                             | Refunded               |

## Courier System

### User Roles

- `user` - Regular buyer
- `seller` - Store owner
- `courier` - ShopIt delivery courier
- `admin` - Platform administrator

### Courier Registration

Couriers register via a hidden link (not publicly visible):

1. If user has account: Submit courier application form
2. If no account: Register first, then submit application

**Required Fields:**
- Phone number
- Identification number (personal ID)
- Bank account number (IBAN)
- Bank code (default: BAGAGE22 - Bank of Georgia)

**Optional Fields:**
- Vehicle type (car, motorcycle, bicycle, walking)
- Working areas (regions/cities)

### Courier Approval

Couriers require admin approval before they can accept deliveries:

- `isCourierApproved: false` - Pending approval
- `isCourierApproved: true` - Approved and active

### Courier API Endpoints

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

### Courier Order Management

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

## Order Schema Fields

| Field       | Type     | Description                        |
| ----------- | -------- | ---------------------------------- |
| `courierId` | ObjectId | Assigned courier (ref: User)       |
| `shippedAt` | Date     | When order was marked as shipped   |

## Status Transition Rules (Seller)

| Current Status       | Allowed for ShopIt Delivery          | Allowed for Self Delivery            |
| -------------------- | ------------------------------------ | ------------------------------------ |
| `pending`            | None (payment only)                  | None (payment only)                  |
| `paid`               | → processing, ready_for_delivery     | → processing, shipped, delivered     |
| `processing`         | → paid, ready_for_delivery           | → paid, shipped, delivered           |
| `ready_for_delivery` | → processing                         | N/A                                  |
| `shipped`            | N/A (courier only)                   | → processing, delivered              |
| `delivered`          | N/A (courier only)                   | → shipped                            |
| `cancelled`          | None                                 | None                                 |
| `refunded`           | None                                 | None                                 |

## File Locations

- **Store Schema**: `libs/api/database/src/lib/schemas/store.schema.ts`
- **User Schema**: `libs/api/database/src/lib/schemas/user.schema.ts`
- **Order Schema**: `libs/api/database/src/lib/schemas/order.schema.ts`
- **Orders Service**: `apps/api/src/orders/orders.service.ts`
- **Orders Controller**: `apps/api/src/orders/orders.controller.ts`
- **Auth Service**: `apps/api/src/auth/auth.service.ts`
- **Auth Controller**: `apps/api/src/auth/auth.controller.ts`
- **Stores Service**: `apps/api/src/stores/stores.service.ts`

