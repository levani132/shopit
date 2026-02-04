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

| Field                  | Required | Description                        |
| ---------------------- | -------- | ---------------------------------- |
| `phoneNumber`          | Yes      | Contact number                     |
| `identificationNumber` | Yes      | Georgian personal ID (11 digits)   |
| `accountNumber`        | Yes      | Bank account (IBAN) for payouts    |
| `beneficiaryBankCode`  | No       | SWIFT/BIC code (default: BAGAGE22) |
| `vehicleType`          | No       | car, motorcycle, bicycle, walking  |
| `workingAreas`         | No       | Regions/cities for deliveries      |

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
// Returns ALL orders with status READY_FOR_DELIVERY
// Sorted by: deadline, then vehicle match, then size
// Includes: estimatedShippingSize, confirmedShippingSize, shippingSize

GET /api/v1/orders/courier/my-orders
// Returns orders assigned to current courier

GET /api/v1/orders/courier/completed
// Returns completed deliveries by this courier

PATCH /api/v1/orders/:id/assign-courier
// Courier claims an order

PATCH /api/v1/orders/:id/courier-status
Body: { status: 'shipped' | 'delivered' }
// Courier updates order status
```

## Order Display Features

### Available Orders Page

The deliveries page (`/dashboard/deliveries`) shows all available orders with enhanced features:

#### Order Card Elements

- **Order ID & Value**: Quick identification and total price
- **Shipping Size Badge**: Required vehicle type indicator
  - 🚲 Small (Bike/Motorcycle)
  - 🚗 Medium (Car)
  - 🚙 Large (SUV)
  - 🚐 Extra Large (Van/Truck)
- **Compatibility Warning**: Shows if courier's vehicle cannot carry the order
- **Delivery Deadline**: Time remaining with urgency coloring
- **Courier Earnings**: Amount the courier will earn

#### Order Items Accordion

Click "Show Items" to expand and see:

- Product images and names
- Store name and quantity
- Price per item

#### Sorting Logic

Orders are sorted in this priority:

1. Earliest delivery deadline first
2. Orders the courier's vehicle can handle
3. Orders smaller than the courier's vehicle
4. Remaining orders from smallest to largest

This allows couriers to see all opportunities while prioritizing what they can deliver.

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
- [DASHBOARD.md](./DASHBOARD.md) - Dashboard documentation (includes Courier Admin)

## Courier Admin Management

### Overview

The Courier Admin role (`COURIER_ADMIN = 16`) provides fleet management capabilities without full platform admin access.

### Courier Admin Dashboard

Access: `/dashboard/courier-admin`

| Feature             | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| **Fleet Analytics** | Overview of all couriers (total, available, busy, offline) |
| **Urgent Orders**   | Orders approaching or past delivery deadline               |
| **Top Couriers**    | Performance leaderboard by on-time rate                    |
| **Courier List**    | Full list with search, filter, and impersonation           |
| **Courier Details** | Individual stats, delivery history, performance charts     |
| **All Orders**      | View all delivery orders with status filters               |

### Courier Admin API

```
GET /api/v1/courier-admin/analytics
// Fleet-wide stats: total couriers, pending deliveries, urgent orders, on-time rates

GET /api/v1/courier-admin/couriers?status=all&search=&page=1&limit=20
// Paginated courier list with filters

GET /api/v1/courier-admin/couriers/:id
// Individual courier details with stats and recent deliveries

GET /api/v1/courier-admin/orders?status=all&dateRange=all&urgent=false&page=1&limit=20
// All delivery orders with filters
```

### Impersonation

Courier Admins can impersonate couriers for testing/support:

```
POST /api/v1/auth/impersonate/:courierId
// Start session as the courier (COURIER role only)

POST /api/v1/auth/stop-impersonation
// Return to Courier Admin session
```

> **Note:** Unlike full Admins, Courier Admins can ONLY impersonate users with the COURIER role.

### Role Bitmask

```typescript
// In libs/shared/constants/src/lib/roles.ts
export enum Role {
  USER = 1,
  COURIER = 2,
  SELLER = 4,
  ADMIN = 8,
  COURIER_ADMIN = 16,
}
```

Users can have multiple roles (bitmask): A user with role `18` has both `COURIER_ADMIN (16)` and `COURIER (2)` roles.

## Time Tracking

The courier system tracks detailed timestamps for route and delivery operations:

### Route Time Logging

Each route records comprehensive timing data:

| Field         | Description                    |
| ------------- | ------------------------------ |
| `startedAt`   | When route navigation began    |
| `completedAt` | When route was fully completed |

For each stop in a route:

| Field                 | Description                                |
| --------------------- | ------------------------------------------ |
| `actualArrival`       | When courier arrived at the stop           |
| `handlingStartedAt`   | When courier started handling the delivery |
| `completedAt`         | When stop was marked complete              |
| `handlingTimeMinutes` | Calculated time spent at the stop          |

### Order Time Tracking

Orders now include pickup/delivery timestamps:

| Field                  | Description                          |
| ---------------------- | ------------------------------------ |
| `pickedUpAt`           | When item was picked up from store   |
| `shippedAt`            | When order status changed to shipped |
| `deliveredAt`          | When delivery was confirmed          |
| `pickedUpFromRouteId`  | Route ID associated with pickup      |
| `deliveredFromRouteId` | Route ID associated with delivery    |

## Courier Analytics

### Analytics Dashboard

The analytics page (`/dashboard/courier-analytics`) provides comprehensive performance metrics:

#### Summary Cards

- **Total Deliveries**: Lifetime completed deliveries
- **Total Earnings**: Cumulative earnings
- **Total Routes**: Number of completed routes
- **On-Time Rate**: Percentage of on-time deliveries

#### Performance Metrics

- **This Week/Month**: Deliveries, earnings, and routes in current periods
- **Average Handling Time**: Time spent per delivery stop
- **Average Route Time**: Duration per completed route
- **Deliveries per Route**: Average density of deliveries

#### Visualizations

- **Daily Earnings Chart**: Bar chart showing earnings trends
- **Recent Routes**: List of recently completed routes with details

### Analytics API

```
GET /api/v1/analytics/courier?period=week|month|year|all
Response: {
  totalDeliveries: number,
  totalEarnings: number,
  totalRoutes: number,
  thisWeek: { deliveries, earnings, routes },
  thisMonth: { deliveries, earnings, routes },
  averageDeliveriesPerRoute: number,
  averageEarningsPerDelivery: number,
  averageHandlingTimeMinutes: number,
  averageRouteTimeMinutes: number,
  onTimeDeliveryRate: number,
  dailyStats: Array<{ date, deliveries, earnings, routes }>,
  recentRoutes: Array<{ _id, completedAt, deliveries, earnings, duration }>
}
```

## Route Management

### Route Endpoints

```
GET /api/v1/routes
// Returns courier's routes

GET /api/v1/routes/active
// Returns active (in-progress) route

GET /api/v1/routes/:id/details
// Returns detailed route info with all time tracking data

GET /api/v1/routes/analytics
// Returns courier analytics

POST /api/v1/routes
// Creates new route from selected orders

PATCH /api/v1/routes/:id/start
// Starts route navigation, sets startedAt

PATCH /api/v1/routes/:id/progress
Body: {
  stopIndex: number,
  action: 'arrive' | 'start_handling' | 'complete',
  location?: { lat, lng }
}
// Updates stop progress with timestamps
// 'arrive' → sets actualArrival
// 'start_handling' → sets handlingStartedAt
// 'complete' → sets completedAt, calculates handlingTimeMinutes
```

### Database Schema Updates

#### courier-route.schema.ts

```typescript
RouteStop {
  ...
  actualArrival?: Date;      // When courier arrived
  handlingStartedAt?: Date;  // When handling began
  completedAt?: Date;        // When stop completed
  handlingTimeMinutes?: number; // Calculated handling duration
}
```

#### order.schema.ts

```typescript
Order {
  ...
  pickedUpAt?: Date;            // When picked up from store
  pickedUpFromRouteId?: ObjectId; // Route used for pickup
  deliveredFromRouteId?: ObjectId; // Route used for delivery
}
```

## Translation Keys

New courier analytics translations:

| Key                  | English             | Georgian                   |
| -------------------- | ------------------- | -------------------------- |
| `totalRoutes`        | Total Routes        | სულ მარშრუტები             |
| `onTimeRate`         | On-Time Rate        | დროული მიტანის მაჩვენებელი |
| `avgHandlingTime`    | Avg. Handling Time  | საშუალო მოცდის დრო         |
| `avgRouteTime`       | Avg. Route Time     | საშუალო მარშრუტის დრო      |
| `recentRoutes`       | Recent Routes       | ბოლო მარშრუტები            |
| `performanceSummary` | Performance Summary | შესრულების მიმოხილვა       |
| `pickedUpAt`         | Picked Up           | აიღო                       |
| `deliveredAt`        | Delivered           | ჩააბარა                    |
