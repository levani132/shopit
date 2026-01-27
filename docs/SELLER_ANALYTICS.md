# Seller Analytics

This document describes the analytics features available to sellers on the ShopIt platform.

## Overview

The Seller Analytics dashboard provides comprehensive insights into store performance, helping sellers make data-driven decisions to grow their business.

## Features

### 1. Overview Metrics

At the top of the analytics page, sellers see four key performance indicators:

- **Total Revenue** - Sum of all revenue from delivered orders in the selected period
- **Total Orders** - Number of orders received in the selected period
- **Average Order Value** - Revenue divided by number of orders
- **Products Sold** - Total quantity of items sold

Each metric (except average order value) shows a percentage change compared to the previous period.

### 2. Revenue Over Time Chart

An interactive bar chart showing daily revenue trends. Features:

- Hover tooltips showing exact date, revenue, and order count
- Automatically scales to fit the data
- Date labels for periods of 14 days or less

### 3. Top Products

A ranked list of the 5 best-selling products by revenue, showing:

- Product rank (1-5)
- Product thumbnail image
- Product name
- Units sold
- Total revenue generated

### 4. Order Status Breakdown

Visual representation of orders by status:

- **Pending** - Awaiting payment or confirmation
- **Paid** - Payment received, awaiting processing
- **Processing** - Being prepared for shipment
- **Shipped** - In transit to customer
- **Delivered** - Successfully delivered
- **Cancelled** - Order was cancelled

Each status shows count and percentage with a progress bar.

### 5. Customer Insights

Key customer metrics:

- **Total Customers** - Unique customers in the period
- **Repeat Rate** - Percentage of customers who have ordered more than once
- **New Customers** - First-time buyers in the period
- **Returning Customers** - Repeat buyers in the period

### 6. Recent Orders

A quick view of the 5 most recent orders showing:

- Order number
- Customer name
- Order total (for store's items)
- Order status

## Time Periods

Analytics can be filtered by:

- **Week** - Last 7 days
- **Month** - Last 30 days (default)
- **Year** - Last 365 days

## API Endpoint

### GET /api/v1/stores/analytics

Returns comprehensive analytics for the authenticated seller's store.

#### Query Parameters

| Parameter | Type   | Default | Description                             |
| --------- | ------ | ------- | --------------------------------------- |
| period    | string | 'month' | Time period: 'week', 'month', or 'year' |

#### Response Structure

```typescript
{
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalProductsSold: number;
    conversionRate: number;
  }
  revenueOverTime: Array<{
    date: string; // YYYY-MM-DD format
    revenue: number;
    orders: number;
  }>;
  orderStatusBreakdown: Record<string, number>; // status -> count
  topProducts: Array<{
    productId: string;
    name: string;
    image?: string;
    totalSold: number;
    revenue: number;
  }>;
  customerInsights: {
    totalCustomers: number;
    repeatCustomers: number;
    newCustomers: number;
    repeatRate: number; // Percentage (0-100)
  }
  recentOrders: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  periodComparison: {
    revenueChange: number; // Percentage change from previous period
    ordersChange: number;
    customersChange: number;
  }
}
```

#### Example Request

```bash
curl -X GET "https://api.shopit.ge/api/v1/stores/analytics?period=month" \
  -H "Authorization: Bearer <access_token>"
```

#### Authentication

Requires a valid JWT token with SELLER role.

## Data Calculations

### Revenue

Revenue is calculated from order items belonging to the seller's store, not the entire order total. This is important for multi-store orders.

### Repeat Rate

The repeat rate is calculated based on all-time order history, not just the selected period. A customer is considered "repeat" if they have placed more than one order with the store ever.

### Period Comparison

Changes are calculated as: `((current - previous) / previous) * 100`

If the previous period has no data, and current period has data, change is shown as 100%.

## Frontend Implementation

The analytics page is located at:

```
apps/web/src/app/[locale]/dashboard/analytics/page.tsx
```

### Key Components

- **StatCard** - Reusable component for displaying metrics with optional change indicator
- **Revenue Chart** - Custom bar chart using pure CSS (no chart library)
- **Top Products List** - With product images and rankings
- **Customer Insights Grid** - 2x2 grid of customer metrics

### Translations

Translations are in the `sellerAnalytics` namespace:

- English: `apps/web/src/messages/en.json`
- Georgian: `apps/web/src/messages/ka.json`

## Future Enhancements

Potential future additions:

- Export analytics as CSV/PDF
- Conversion rate tracking (requires view tracking)
- Compare with previous periods side-by-side
- Product performance trends
- Customer demographics
- Peak ordering times
- Geographic distribution of customers
