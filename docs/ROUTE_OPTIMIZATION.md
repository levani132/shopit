# Route Optimization System

## Overview

The Route Optimization System helps couriers plan efficient delivery routes by automatically generating optimal paths through multiple pickup and delivery points. The system considers vehicle capacity, order deadlines, travel times, and rest periods to create practical routes of various durations (1-8 hours).

## Key Features

### For Couriers

- **Starting Position Setup**: Set or update starting location from saved addresses or add new
- **Route Duration Options**: View pre-calculated routes for 1h, 2h, 3h, 4h, 5h, 6h, 7h, 8h durations
- **Earnings Preview**: See potential earnings for each route before committing
- **Real-time Updates**: Routes recalculate when orders become unavailable
- **Flexible Execution**: Adjust route on-the-fly if capacity issues arise
- **Map & List Views**: Toggle between visual map and detailed list view
- **Optional Breaks**: Include scheduled rest breaks for longer routes

### For the System

- **Efficient Algorithm**: Handles 1000+ orders without performance issues
- **Capacity Awareness**: Respects vehicle carrying limits
- **Deadline Compliance**: Only includes orders deliverable within deadlines
- **Distance Optimization**: Uses routing APIs for accurate time estimates

## Algorithm Design

### Approach: Cluster-First, Route-Second with Greedy Optimization

Given the constraint of handling up to 1000 orders efficiently, we use a heuristic-based approach rather than exact optimization:

#### Phase 1: Pre-filtering

```
1. Filter orders by status (READY_FOR_DELIVERY only)
2. Filter by deadline (exclude orders that can't be delivered in time)
3. Filter by vehicle compatibility (shipping size vs vehicle capacity)
4. Calculate distance from courier starting point to each pickup location
```

#### Phase 2: Clustering

```
1. Divide the service area into geographic zones/clusters
2. Group orders by pickup location proximity
3. Score clusters by order density and total value
4. Prioritize clusters near the courier's starting point
```

#### Phase 3: Route Building (Greedy with Constraints)

```
For each target duration (1h, 2h, ... 8h):
  route = []
  currentLocation = courierStartPoint
  currentLoad = 0
  currentTime = 0
  ordersCarrying = []

  While currentTime < targetDuration:
    # If at capacity, must deliver
    If currentLoad >= vehicleCapacity:
      nextStop = findNearestDeliveryPoint(ordersCarrying, currentLocation)
    Else:
      # Consider both pickups and deliveries
      candidatePickups = findNearbyPickups(availableOrders, currentLocation)
      candidateDeliveries = findNearbyDeliveries(ordersCarrying, currentLocation)

      # Score candidates by:
      # - Distance (shorter is better)
      # - Deadline urgency (urgent is better)
      # - Route efficiency (aligns with overall direction)
      nextStop = selectBestCandidate(candidatePickups, candidateDeliveries)

    # Update state
    travelTime = calculateTravelTime(currentLocation, nextStop)
    currentTime += travelTime + HANDLING_TIME + REST_TIME
    currentLocation = nextStop.location

    If nextStop.type == 'pickup':
      currentLoad += 1
      ordersCarrying.add(nextStop.order)
    Else:
      currentLoad -= 1
      ordersCarrying.remove(nextStop.order)

    route.add(nextStop)

  # Must deliver all remaining orders
  While ordersCarrying.length > 0:
    nextStop = findNearestDeliveryPoint(ordersCarrying, currentLocation)
    route.add(nextStop)
    ordersCarrying.remove(nextStop.order)
```

### Time Constants

| Activity                         | Duration     |
| -------------------------------- | ------------ |
| Order handling (pickup/delivery) | 5 minutes    |
| Rest period per stop             | 10 minutes   |
| Buffer factor                    | 15% of total |
| Break (optional, 4h+ routes)     | 30 minutes   |

### Distance/Time Calculation

- Primary: OpenRouteService API for accurate road-based routing
- Fallback: Haversine formula with speed estimates
- Caching: Store calculated distances for 24 hours

## Data Model

### CourierRoute Schema

```typescript
{
  _id: ObjectId,
  courierId: ObjectId,
  status: 'draft' | 'active' | 'completed' | 'abandoned',

  // Route configuration
  startingPoint: {
    address: string,
    city: string,
    coordinates: { lat: number, lng: number }
  },
  targetDuration: number, // in minutes (60, 120, 180, ...)
  includeBreaks: boolean,

  // Route details
  stops: [{
    order: ObjectId,
    type: 'pickup' | 'delivery',
    location: {
      address: string,
      city: string,
      coordinates: { lat: number, lng: number }
    },
    estimatedArrival: Date,
    actualArrival?: Date,
    status: 'pending' | 'arrived' | 'completed' | 'skipped',
    contactPhone?: string,
    contactName?: string,
    isBreak?: boolean // For scheduled breaks
  }],

  // Progress tracking
  currentStopIndex: number,
  completedStops: number,

  // Time estimates
  estimatedTotalTime: number, // minutes
  estimatedEndTime: Date,
  actualStartTime?: Date,
  actualEndTime?: Date,

  // Earnings
  estimatedEarnings: number,
  actualEarnings: number,

  // Orders included
  orderIds: ObjectId[],

  // Timestamps
  createdAt: Date,
  startedAt?: Date,
  completedAt?: Date
}
```

### Route Stop Details

Each stop contains:

- Order information (ID, items, value)
- Location with coordinates
- Contact information
- Estimated vs actual arrival times
- Status for progress tracking

## API Endpoints

### Route Generation

```
POST /api/v1/routes/generate
Body: {
  startingPoint: { lat, lng, address, city },
  includeBreaks?: boolean,
  vehicleType?: string
}
Response: {
  routes: [{
    duration: 60,        // Target duration in minutes
    durationLabel: "1h",
    stops: [...],
    orderCount: 5,
    estimatedEarnings: 45.50,
    estimatedTime: 58,   // Actual estimated time
    distance: 12.5       // km
  }, ...]
}
```

### Claim Route

```
POST /api/v1/routes/claim
Body: {
  duration: 120,         // Selected duration option
  stops: [...],          // Route stops (for validation)
  orderIds: [...]        // Orders to claim
}
Response: {
  routeId: "...",
  status: "active",
  ...routeDetails
}
```

### Get Active Route

```
GET /api/v1/routes/active
Response: {
  route: {...} | null
}
```

### Update Route Progress

```
PATCH /api/v1/routes/:id/progress
Body: {
  stopIndex: 2,
  action: 'arrived' | 'completed' | 'skipped'
}
```

### Cannot Carry More

```
POST /api/v1/routes/:id/cannot-carry
Response: {
  route: {...}  // Recalculated with deliveries first
}
```

### Abandon Route

```
POST /api/v1/routes/:id/abandon
Body: {
  reason?: string
}
```

### Complete Route

```
POST /api/v1/routes/:id/complete
```

## UI Flow

### Routes Page (`/dashboard/routes`)

#### State 1: No Starting Position

```
┌─────────────────────────────────────────────────┐
│  🚚 Plan Your Delivery Route                     │
│                                                  │
│  Set your starting position to see available     │
│  routes                                          │
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ 📍 Choose Starting Location                 ││
│  │                                             ││
│  │ ○ Home - 15 Rustaveli Ave, Tbilisi          ││
│  │ ○ Work - 42 Chavchavadze, Tbilisi           ││
│  │ ○ + Add New Address                         ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  [Continue →]                                    │
└─────────────────────────────────────────────────┘
```

#### State 2: Route Selection

```
┌─────────────────────────────────────────────────┐
│  🚚 Available Routes                             │
│                                                  │
│  Starting from: 📍 15 Rustaveli Ave [Change]    │
│                                                  │
│  ☐ Include 30min breaks for longer routes       │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ ~1 hour  │ │ ~2 hours │ │ ~3 hours │  ...    │
│  │          │ │          │ │          │         │
│  │ 3 orders │ │ 6 orders │ │ 9 orders │         │
│  │ ₾28.50   │ │ ₾54.00   │ │ ₾82.50   │         │
│  │          │ │          │ │          │         │
│  │ [View]   │ │ [View]   │ │ [View]   │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                  │
│  🔄 Refreshing in 30s...                         │
└─────────────────────────────────────────────────┘
```

#### State 3: Route Preview

```
┌─────────────────────────────────────────────────┐
│  ← Back to Routes                                │
│                                                  │
│  ~2 Hour Route Preview                           │
│  6 orders • ₾54.00 earnings • 14.2 km           │
│                                                  │
│  [🗺️ Map] [📋 List]                              │
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │         (Map or List of stops)              ││
│  │                                             ││
│  │  1. 📦 Pickup - Store A (10:15)             ││
│  │  2. 📦 Pickup - Store B (10:28)             ││
│  │  3. 🏠 Deliver - Customer X (10:45)         ││
│  │  4. 📦 Pickup - Store C (11:02)             ││
│  │  5. 🏠 Deliver - Customer Y (11:20)         ││
│  │  ...                                        ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  [Start This Route]                              │
└─────────────────────────────────────────────────┘
```

### Active Route View

```
┌─────────────────────────────────────────────────┐
│  Active Route • 3/10 stops completed             │
│                                                  │
│  ⏱️ Est. completion: 12:45 PM                    │
│  💰 Earned: ₾24.00 / ₾54.00                      │
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ NEXT STOP                                   ││
│  │ 📦 PICKUP from TechStore                    ││
│  │ 📍 42 Chavchavadze Ave, Tbilisi             ││
│  │                                             ││
│  │ Order #ABC123 • 2 items • ₾85.00            ││
│  │ - iPhone Case x1                            ││
│  │ - Screen Protector x1                       ││
│  │                                             ││
│  │ ☎️ Call: +995 555 123456                     ││
│  │                                             ││
│  │ [🗺️ Navigate] [✓ Arrived] [⏭️ Can't Carry]  ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  ⚠️ Call ahead: Stop #5 (Store D) in ~1 hour    │
│                                                  │
│  Upcoming Stops:                                 │
│  4. 🏠 Deliver - Customer Z (11:35)             │
│  5. 📦 Pickup - Store D (11:52)                 │
│  6. 🏠 Deliver - Customer W (12:10)             │
│  ...                                            │
│                                                  │
│  [🚫 Abandon Route]                              │
└─────────────────────────────────────────────────┘
```

## Real-time Considerations

### Order Availability

- Routes are generated with currently available orders
- WebSocket connection monitors order status changes
- If an order in the generated route is claimed by another courier:
  1. Show notification to user
  2. Mark route as stale
  3. Offer to regenerate routes

### Route Claiming Race Condition

- When courier claims a route, backend validates all orders are still available
- Uses transactions to atomically claim all orders
- If any order is unavailable, return error with details

### Active Route Updates

- If courier presses "Can't Carry":
  1. Reorder remaining stops: deliveries before pickups
  2. Don't change route scope, just order
  3. Update estimated times

## Performance Optimization

### Caching Strategy

1. **Distance Cache**: Store A→B distances for 24h
2. **Cluster Cache**: Pre-compute order clusters hourly
3. **Route Cache**: Cache generated routes for 30 seconds

### Batching

- Batch routing API calls (up to 25 pairs per request)
- Pre-fetch distances for high-density areas

### Limiting

- Consider only top 100 orders by proximity for each route duration
- Use bounding box to filter distant orders early

## Error Handling

| Scenario                          | Handling                             |
| --------------------------------- | ------------------------------------ |
| Routing API unavailable           | Fall back to Haversine estimates     |
| Order claimed during preview      | Show warning, offer regeneration     |
| Order claimed during active route | Skip stop, recalculate earnings      |
| Courier abandons route            | Release all unclaimed orders         |
| No orders available               | Show friendly message, suggest later |

## Translations

New translation keys added to:

- `en.json` → `routes` section
- `ka.json` → `routes` section

## File Structure

```
apps/
  api/src/
    routes/                    # New module
      routes.module.ts
      routes.controller.ts
      routes.service.ts
      dto/
        generate-routes.dto.ts
        claim-route.dto.ts
        update-progress.dto.ts
  web/src/app/[locale]/dashboard/
    routes/
      page.tsx                 # Routes planning page
libs/
  api/database/src/lib/schemas/
    courier-route.schema.ts    # New schema
docs/
  ROUTE_OPTIMIZATION.md        # This file
```

## Related Documentation

- [DELIVERY.md](./DELIVERY.md) - Delivery system overview
- [COURIER_PORTAL.md](./COURIER_PORTAL.md) - Courier portal features
- [ORDERS.md](./ORDERS.md) - Order lifecycle
