# Delivery System Documentation

## Overview

ShopIt supports multiple delivery options for stores:

1. **ShopIt Delivery** (`courierType: 'shopit'`): Platform couriers handle delivery with distance-based pricing
2. **Self Delivery** (`courierType: 'seller'`): Sellers handle their own delivery (free - only site commission applies)
3. **Self Pickup** (`selfPickupEnabled: true`): Customers pick up from store location (free)

## Delivery Fee Calculation

### ShopIt Delivery Pricing

Delivery fees are calculated based on driving time between the store and customer:

```
fee = durationMinutes × ratePerMinute
fee = max(fee, minimumFee)
fee = ceil(fee / precision) × precision  // Round up to precision
```

### Vehicle-Based Rates (Configurable via Admin)

| Vehicle Type | Rate/Min | Min Fee | Max Weight | Max Dimension |
| ------------ | -------- | ------- | ---------- | ------------- |
| Bike         | 0.50 GEL | 3 GEL   | 5 kg       | 30 cm         |
| Car          | 0.75 GEL | 5 GEL   | 20 kg      | 60 cm         |
| SUV          | 1.00 GEL | 8 GEL   | 50 kg      | 100 cm        |
| Van/Truck    | 2.00 GEL | 15 GEL  | unlimited  | unlimited     |

### Distance Calculation

- Uses **OpenRouteService API** for accurate driving time/distance
- Fallback to minimum fee + 2 GEL if API unavailable
- Requires `OPENROUTE_API_KEY` environment variable

### API Endpoint

```
POST /api/v1/orders/calculate-shipping
Body: {
  storeLocation: { lat: number, lng: number },
  customerLocation: { lat: number, lng: number }
}
Response: {
  fee: number,
  durationMinutes: number,
  distanceKm: number,
  currency: "GEL"
}
```

## Store Delivery Settings

### Schema Fields

| Field               | Type    | Default  | Description                                      |
| ------------------- | ------- | -------- | ------------------------------------------------ |
| `courierType`       | string  | 'shopit' | 'shopit' or 'seller'                             |
| `selfPickupEnabled` | boolean | false    | Enable self-pickup option                        |
| `location`          | object  | -        | Store coordinates { lat, lng } for distance calc |
| `prepTimeMinDays`   | number  | 1        | Minimum days to prepare order                    |
| `prepTimeMaxDays`   | number  | 3        | Maximum days to prepare order                    |
| `deliveryMinDays`   | number  | -        | Minimum delivery days (seller delivery only)     |
| `deliveryMaxDays`   | number  | -        | Maximum delivery days (seller delivery only)     |
| `deliveryFee`       | number  | 0        | Custom delivery fee (seller delivery only)       |
| `freeDelivery`      | boolean | false    | Enable free delivery (overrides deliveryFee)     |

### API Endpoints

```
PATCH /api/v1/stores/me
Body: {
  courierType: 'shopit' | 'seller',
  selfPickupEnabled: boolean,
  location: { lat: number, lng: number },
  prepTimeMinDays: number,
  prepTimeMaxDays: number,
  deliveryMinDays: number,    // Only for seller delivery
  deliveryMaxDays: number,    // Only for seller delivery
  deliveryFee: number,        // Only for seller delivery
  freeDelivery: boolean       // Only for seller delivery
}
```

## Shipping Address

### Address Picker with Map

Customers select their delivery address using an interactive map:

- Map-based location selection (click or drag marker)
- Address search with autocomplete (Photon API)
- **Georgia-only validation**: Addresses outside Georgia are rejected
- Coordinates are stored for distance calculation

### Shipping Address Schema

| Field         | Type    | Required | Description                |
| ------------- | ------- | -------- | -------------------------- |
| `address`     | string  | Yes      | Full address text          |
| `city`        | string  | Yes      | City name                  |
| `postalCode`  | string  | No       | Postal code                |
| `country`     | string  | Yes      | Country (default: Georgia) |
| `phoneNumber` | string  | Yes      | Contact phone              |
| `location`    | object  | No       | Coordinates { lat, lng }   |
| `isDefault`   | boolean | No       | Mark as default address    |

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

### Self Pickup Flow

```
PENDING → PAID → PROCESSING → READY_FOR_PICKUP → PICKED_UP
                     ↑                ↑              ↑
                  (Seller)        (Seller)       (Seller)
```

## Order Statuses

| Status               | Description                     | Visible to Customer As |
| -------------------- | ------------------------------- | ---------------------- |
| `pending`            | Awaiting payment                | Pending                |
| `paid`               | Payment confirmed               | Paid                   |
| `processing`         | Seller preparing order          | Processing             |
| `ready_for_delivery` | Ready for ShopIt courier pickup | Processing             |
| `shipped`            | Order in transit                | Shipped                |
| `delivered`          | Order delivered                 | Delivered              |
| `cancelled`          | Order cancelled                 | Cancelled              |
| `refunded`           | Order refunded                  | Refunded               |

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

### Courier Earnings

Couriers receive a percentage of the delivery fee (configurable via admin):

```
courierEarning = deliveryFee × courierEarningsPercentage
```

Default: 80% of delivery fee goes to courier.

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

| Field       | Type     | Description                      |
| ----------- | -------- | -------------------------------- |
| `courierId` | ObjectId | Assigned courier (ref: User)     |
| `shippedAt` | Date     | When order was marked as shipped |

## Status Transition Rules (Seller)

| Current Status       | Allowed for ShopIt Delivery      | Allowed for Self Delivery        |
| -------------------- | -------------------------------- | -------------------------------- |
| `pending`            | None (payment only)              | None (payment only)              |
| `paid`               | → processing, ready_for_delivery | → processing, shipped, delivered |
| `processing`         | → paid, ready_for_delivery       | → paid, shipped, delivered       |
| `ready_for_delivery` | → processing                     | N/A                              |
| `shipped`            | N/A (courier only)               | → processing, delivered          |
| `delivered`          | N/A (courier only)               | → shipped                        |
| `cancelled`          | None                             | None                             |
| `refunded`           | None                             | None                             |

## Admin Settings (Site Settings)

| Setting                        | Type   | Default | Description                           |
| ------------------------------ | ------ | ------- | ------------------------------------- |
| `siteCommissionRate`           | number | 0.10    | Commission rate (10%)                 |
| `bikeShipping`                 | object | -       | Bike delivery rate config             |
| `carShipping`                  | object | -       | Car delivery rate config              |
| `suvShipping`                  | object | -       | SUV delivery rate config              |
| `vanShipping`                  | object | -       | Van/truck delivery rate config        |
| `defaultDeliveryRatePerMinute` | number | 0.5     | Default rate when dimensions unknown  |
| `minimumDeliveryFee`           | number | 3       | Minimum delivery fee in GEL           |
| `deliveryFeePrecision`         | number | 0.5     | Round up to this precision            |
| `courierEarningsPercentage`    | number | 0.80    | Courier's share of delivery fee (80%) |

## Product Shipping Size

Products are categorized by shipping size instead of explicit dimensions:

| Size Category | Vehicle   | Description                                  |
| ------------- | --------- | -------------------------------------------- |
| `small`       | Bike      | ≤5kg, ≤30cm - Small items, documents         |
| `medium`      | Car       | ≤20kg, ≤60cm - Standard boxes, electronics   |
| `large`       | SUV       | ≤50kg, ≤100cm - Large boxes, furniture parts |
| `extra_large` | Van/Truck | >50kg or >100cm - Appliances, mattresses     |

The largest product in the cart determines the vehicle type and delivery rate.

### Order Shipping Size Estimation

When an order is created, the system automatically estimates the required vehicle type:

1. **Automatic Estimation**: The `estimatedShippingSize` is calculated from the largest item in the order
2. **Seller Confirmation**: Before setting the order to "Ready for Delivery", the seller can review and override the estimated size
3. **Confirmed Size**: The `confirmedShippingSize` stores the seller's decision (if different from estimated)
4. **Effective Size**: The `shippingSize` field always contains the effective size (confirmed if set, otherwise estimated)

#### Order Schema Fields

| Field                   | Type   | Description                                                           |
| ----------------------- | ------ | --------------------------------------------------------------------- |
| `estimatedShippingSize` | string | Auto-calculated from largest product (small/medium/large/extra_large) |
| `confirmedShippingSize` | string | Seller-confirmed size (optional, overrides estimated)                 |
| `shippingSize`          | string | Effective size used for courier filtering                             |

#### API Endpoint for Seller Override

```
PATCH /api/v1/orders/:id/shipping-size
Body: { "shippingSize": "small" | "medium" | "large" | "extra_large" }
Auth: Seller or Admin role required
```

**Rules:**

- Cannot change after a courier is assigned
- Cannot change for delivered/cancelled/refunded orders
- Updates both `confirmedShippingSize` and `shippingSize`

### API Endpoint

```
GET /api/v1/settings/shipping-sizes
Response: {
  small: { ratePerMinute, minimumFee, maxWeight, maxDimension },
  medium: { ... },
  large: { ... },
  extra_large: { ... }
}
```

## Courier Dashboard

Couriers have a dedicated dashboard with role-specific content:

### Dashboard Stats

- **Available Deliveries**: Orders ready for pickup
- **My Deliveries**: Assigned orders in progress
- **Total Earnings**: Cumulative earnings
- **Completed Today**: Deliveries completed today

### Quick Actions

- View Deliveries
- View Balance
- View Analytics
- Edit Profile

### Sidebar Sections (Courier)

- Overview
- My Shopping (orders, wishlist)
- Administration (profile, addresses, devices)
- Deliveries
- Results (balance, analytics)

### Available Orders Display

The courier deliveries page shows **all available orders** (not just those matching the courier's vehicle):

#### Sorting Priority

1. **Delivery Deadline**: Earliest deadlines first (most urgent)
2. **Vehicle Compatibility**: Orders this courier can carry
3. **Smaller Orders**: Orders smaller than the courier's vehicle capacity
4. **Everything Else**: Remaining orders from smallest to largest

#### Order Card Features

- **Shipping Size Indicator**: Shows required vehicle type with icon and color
- **Compatibility Warning**: Red indicator if courier's vehicle cannot carry the order
- **Accordion Items List**: Expandable section showing all order items with details
- **Deadline Urgency**: Color-coded time remaining (green → orange → red)
- **Earnings Display**: Courier's share of the delivery fee

#### Vehicle Capacity Reference

| Vehicle Type | Can Carry                             |
| ------------ | ------------------------------------- |
| Walking      | Small only (5 items max)              |
| Bicycle      | Small only (5 items max)              |
| Motorcycle   | Small only (5 items max)              |
| Car          | Small (unlimited) + Medium (3 items)  |
| SUV          | Small, Medium (unlimited) + Large (2) |
| Van          | All sizes (Extra Large: 2 items max)  |

## Delivery Time Estimates

Displayed to customers based on distance:

| Distance from Store | Estimated Delivery |
| ------------------- | ------------------ |
| ≤35 km              | 1-3 days           |
| >35 km              | 3-7 days           |

Note: Actual delivery times may vary as couriers batch deliveries.

## File Locations

- **Store Schema**: `libs/api/database/src/lib/schemas/store.schema.ts`
- **User Schema**: `libs/api/database/src/lib/schemas/user.schema.ts`
- **Order Schema**: `libs/api/database/src/lib/schemas/order.schema.ts`
- **Site Settings Schema**: `libs/api/database/src/lib/schemas/site-settings.schema.ts`
- **Delivery Fee Service**: `apps/api/src/orders/delivery-fee.service.ts`
- **Orders Service**: `apps/api/src/orders/orders.service.ts`
- **Orders Controller**: `apps/api/src/orders/orders.controller.ts`
- **Auth Service**: `apps/api/src/auth/auth.service.ts`
- **Auth Controller**: `apps/api/src/auth/auth.controller.ts`
- **Stores Service**: `apps/api/src/stores/stores.service.ts`
- **Address Picker**: `apps/web/src/components/ui/AddressPicker.tsx`
- **Checkout Page**: `apps/web/src/app/store/[subdomain]/[locale]/(main)/checkout/page.tsx`

## Environment Variables

| Variable            | Required | Description                           |
| ------------------- | -------- | ------------------------------------- |
| `OPENROUTE_API_KEY` | No       | OpenRouteService API key for distance |
