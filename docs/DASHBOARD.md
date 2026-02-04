# Unified Dashboard Documentation

## Overview

The ShopIt dashboard is a role-based unified interface that shows different pages based on the user's role. All users access the dashboard at `/dashboard`, but see different navigation items and pages.

## User Roles

| Role            | Bitmask | Description             |
| --------------- | ------- | ----------------------- |
| `user`          | 1       | Regular buyer/customer  |
| `courier`       | 2       | ShopIt delivery courier |
| `seller`        | 4       | Store owner             |
| `admin`         | 8       | Platform administrator  |
| `courier_admin` | 16      | Courier fleet manager   |

## Navigation Structure

### Administration Section (All Users)

| Page      | Path                   | Description                     |
| --------- | ---------------------- | ------------------------------- |
| Profile   | `/dashboard/profile`   | Account settings, personal info |
| Addresses | `/dashboard/addresses` | Saved shipping addresses        |
| Devices   | `/dashboard/devices`   | Logged-in devices management    |

### Seller-Only Sections

#### Products Section

| Page       | Path                    | Description        |
| ---------- | ----------------------- | ------------------ |
| Attributes | `/dashboard/attributes` | Product attributes |
| Categories | `/dashboard/categories` | Product categories |
| Products   | `/dashboard/products`   | Product management |

#### Results Section

| Page      | Path                   | Description            |
| --------- | ---------------------- | ---------------------- |
| Orders    | `/dashboard/orders`    | Store orders           |
| Balance   | `/dashboard/balance`   | Earnings & withdrawals |
| Analytics | `/dashboard/analytics` | Store analytics        |

### Courier-Only Sections

#### Deliveries Section

| Page            | Path                    | Description               |
| --------------- | ----------------------- | ------------------------- |
| Delivery Orders | `/dashboard/deliveries` | Available & my deliveries |

#### Results Section

| Page              | Path                           | Description            |
| ----------------- | ------------------------------ | ---------------------- |
| Courier Balance   | `/dashboard/courier-balance`   | Earnings & withdrawals |
| Courier Analytics | `/dashboard/courier-analytics` | Delivery statistics    |

### Courier Admin Sections

#### Fleet Management

| Page            | Path                                    | Description                |
| --------------- | --------------------------------------- | -------------------------- |
| Analytics       | `/dashboard/courier-admin`              | Fleet analytics overview   |
| Manage Couriers | `/dashboard/courier-admin/couriers`     | List & manage all couriers |
| Courier Details | `/dashboard/courier-admin/couriers/:id` | Individual courier stats   |
| All Orders      | `/dashboard/courier-admin/orders`       | All delivery orders        |

#### Courier Admin Capabilities

- View fleet-wide analytics (total couriers, active/busy/offline status)
- Monitor order deadlines and urgent deliveries
- View individual courier performance (on-time rate, avg delivery time)
- Impersonate couriers for testing/support (COURIER role only)
- Track delivery orders across all couriers

## Role-Based Navigation

The `DashboardSidebar` component (`apps/web/src/components/dashboard/DashboardSidebar.tsx`) filters navigation items based on the user's role:

```typescript
interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  roles?: UserRole[]; // If undefined, shown to all roles
}

interface NavSection {
  titleKey?: string;
  items: NavItem[];
  roles?: UserRole[]; // If undefined, shown to all roles
}
```

### Filtering Logic

```typescript
const shouldShowForRole = (roles?: UserRole[]) => {
  if (!roles) return true; // No restriction - show to all
  return roles.includes(userRole) || userRole === 'admin'; // Admin sees all
};
```

## Page Descriptions

### Profile Page

The profile page adapts content based on user role:

- **All Users**: Account info, personal info, password change
- **Sellers**: + Bank details, store info
- **Couriers**: + Bank details, vehicle info, working areas

### Addresses Page

Manage shipping addresses for checkout:

- Add new addresses
- Edit existing addresses
- Set default address
- Delete addresses

### Devices Page

Manage logged-in devices:

- View active sessions
- View session history
- Revoke individual sessions
- Revoke all other sessions

### Deliveries Page (Courier)

Manage delivery orders:

- View available orders (READY_FOR_DELIVERY status)
- Claim orders (assign to self)
- View my assigned orders
- Mark orders as shipped/delivered

## File Structure

```
apps/web/src/app/[locale]/dashboard/
├── page.tsx              # Overview (sellers/couriers)
├── layout.tsx            # Dashboard layout with sidebar
├── profile/page.tsx      # Profile settings
├── addresses/page.tsx    # Address management
├── devices/page.tsx      # Device management
├── store/page.tsx        # Store settings (sellers)
├── attributes/page.tsx   # Attributes (sellers)
├── categories/page.tsx   # Categories (sellers)
├── products/page.tsx     # Products (sellers)
├── orders/page.tsx       # Orders (sellers)
├── balance/page.tsx      # Balance (sellers)
├── analytics/page.tsx    # Analytics (sellers)
├── deliveries/page.tsx   # Deliveries (couriers)
├── courier-balance/page.tsx    # Balance (couriers)
├── courier-analytics/page.tsx  # Analytics (couriers)
└── courier-admin/              # Fleet management (courier admins)
    ├── page.tsx                # Fleet analytics dashboard
    ├── couriers/
    │   ├── page.tsx            # Courier list
    │   └── [id]/page.tsx       # Courier details
    └── orders/page.tsx         # All delivery orders
```

## Translations

Dashboard translations are in the `dashboard` namespace:

```json
{
  "dashboard": {
    "sectionAdmin": "Administration",
    "sectionProducts": "Products",
    "sectionDeliveries": "Deliveries",
    "sectionResults": "Results",
    "profile": "Profile",
    "addresses": "Addresses",
    "devices": "Devices",
    "deliveryOrders": "Delivery Orders",
    "courierBalance": "Balance",
    "courierAnalytics": "Analytics"
    // ... more translations
  }
}
```

## API Endpoints

### Addresses

```
GET    /api/v1/auth/addresses           # Get all addresses
POST   /api/v1/auth/addresses           # Add address
PUT    /api/v1/auth/addresses/:id       # Update address
DELETE /api/v1/auth/addresses/:id       # Delete address
PATCH  /api/v1/auth/addresses/:id/default # Set default
```

### Devices

```
GET    /api/v1/auth/devices             # Get all devices
POST   /api/v1/auth/devices/trust       # Trust device
DELETE /api/v1/auth/devices/:fingerprint # Revoke device
POST   /api/v1/auth/devices/revoke-all  # Revoke all
```

### Courier Admin

```
GET    /api/v1/courier-admin/analytics      # Fleet analytics overview
GET    /api/v1/courier-admin/couriers       # List all couriers (paginated)
GET    /api/v1/courier-admin/couriers/:id   # Courier details with stats
GET    /api/v1/courier-admin/orders         # All delivery orders (paginated)
```

### Impersonation

```
POST   /api/v1/auth/impersonate/:userId     # Start impersonation (Admin/CourierAdmin)
POST   /api/v1/auth/stop-impersonation      # Return to admin session
```

> **Note:** COURIER_ADMIN role can only impersonate users with the COURIER role.

## Related Documentation

- [COURIER_PORTAL.md](./COURIER_PORTAL.md) - Courier portal documentation
- [DELIVERY.md](./DELIVERY.md) - Delivery system documentation
- [ORDERS.md](./ORDERS.md) - Order management documentation
