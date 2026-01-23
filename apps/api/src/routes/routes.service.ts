import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { SiteSettingsService } from '../admin/site-settings.service';
import { BalanceService } from '../orders/balance.service';
import {
  CourierRoute,
  CourierRouteDocument,
  RouteStatus,
  StopStatus,
  StopType,
  RouteStop,
  RouteLocation,
} from '@shopit/api-database';
import { Order, OrderDocument, OrderStatus } from '@shopit/api-database';
import { User, UserDocument } from '@shopit/api-database';
import { VEHICLE_CAPACITIES } from '@shopit/constants';
import {
  GenerateRoutesDto,
  RoutePreviewDto,
  RouteStopPreviewDto,
  ClaimRouteDto,
} from './dto/routes.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Time constants for route calculations (in minutes)
 */
const TIME_CONSTANTS = {
  HANDLING_TIME: 5, // Time to pick up or deliver an order
  REST_TIME_PER_STOP: 5, // Extra time between stops
  BREAK_DURATION: 30, // Break duration for long routes
  BUFFER_FACTOR: 0.15, // 15% buffer for unexpected delays
};

/**
 * Target durations for route generation (in minutes)
 */
const TARGET_DURATIONS = [60, 120, 180, 240, 300, 360, 420, 480];

/**
 * Location with coordinates
 */
interface Location {
  lat: number;
  lng: number;
}

/**
 * Order with calculated distance from starting point
 */
interface OrderWithDistance {
  order: OrderDocument;
  pickupDistance: number;
  deliveryDistance: number;
  pickupLocation: Location;
  deliveryLocation: Location;
}

/**
 * Internal stop representation for algorithm
 */
interface AlgorithmStop {
  id: string;
  orderId: Types.ObjectId;
  type: StopType;
  location: Location;
  address: string;
  city: string;
  contactName?: string;
  contactPhone?: string;
  storeName?: string;
  orderValue?: number;
  courierEarning?: number; // Courier's earning from this delivery (shipping price * earnings percentage)
  shippingSize?: 'regular' | 'large' | 'xl';
  deliveryDeadline?: Date;
  orderItems?: {
    name: string;
    nameEn?: string;
    image: string;
    qty: number;
    price: number;
  }[];
}

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);
  private readonly apiKey: string;

  // Simple in-memory cache for distance calculations
  private distanceCache: Map<string, { distance: number; duration: number }> =
    new Map();

  constructor(
    @InjectModel(CourierRoute.name)
    private courierRouteModel: Model<CourierRouteDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private siteSettingsService: SiteSettingsService,
    @Inject(forwardRef(() => BalanceService))
    private balanceService: BalanceService,
  ) {
    this.apiKey = this.configService.get<string>('OPENROUTE_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn(
        'OPENROUTE_API_KEY not configured. Route optimization will use fallback distance estimates.',
      );
    }
  }

  /**
   * Generate route options for different durations
   */
  async generateRoutes(
    courierId: string,
    dto: GenerateRoutesDto,
  ): Promise<{
    routes: RoutePreviewDto[];
    generatedAt: Date;
    expiresAt: Date;
    availableOrderCount: number;
  }> {
    const courier = await this.userModel.findById(courierId);
    if (!courier) {
      throw new BadRequestException('Courier not found');
    }

    const vehicleType = dto.vehicleType || courier.vehicleType || 'car';

    // Get compatible shipping sizes for this vehicle
    const vehicleKey = vehicleType as keyof typeof VEHICLE_CAPACITIES;
    const capacity =
      VEHICLE_CAPACITIES[vehicleKey] || VEHICLE_CAPACITIES['car'];
    // Get sizes this vehicle can carry (where capacity > 0 or -1 for unlimited)
    const compatibleSizes = (
      ['small', 'medium', 'large', 'extra_large'] as const
    ).filter((size) => capacity[size] !== 0);

    // Get max items courier can carry (based on vehicle type)
    const maxItems = this.getMaxItemsForVehicle(vehicleType);

    // Fetch available orders
    const availableOrders = await this.getAvailableOrders(compatibleSizes);

    if (availableOrders.length === 0) {
      return {
        routes: [],
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 1000), // 30 seconds
        availableOrderCount: 0,
      };
    }

    // Calculate distances from starting point for each order
    const ordersWithDistance = await this.calculateOrderDistances(
      availableOrders,
      dto.startingPoint,
    );

    // Generate routes for each target duration
    const routes: RoutePreviewDto[] = [];

    for (const targetDuration of TARGET_DURATIONS) {
      const route = await this.buildRouteForDuration(
        ordersWithDistance,
        dto.startingPoint,
        targetDuration,
        maxItems,
        Boolean(dto.includeBreaks && targetDuration >= 240), // Include breaks for 4h+ routes
      );

      if (route && route.stops.length > 0) {
        routes.push(route);
      }
    }

    // Post-process: For routes with all orders and NO breaks,
    // use the most efficient route's stops/distance
    // (Routes with breaks are separate and should not be compared)
    if (!dto.includeBreaks) {
      let bestRouteForAllOrders: RoutePreviewDto | null = null;

      // Find the most efficient route that includes all orders
      for (const route of routes) {
        if (route.orderCount === availableOrders.length) {
          if (
            !bestRouteForAllOrders ||
            route.estimatedTime < bestRouteForAllOrders.estimatedTime
          ) {
            bestRouteForAllOrders = route;
          }
        }
      }

      // Replace inefficient routes with the best one's data
      if (bestRouteForAllOrders) {
        for (let i = 0; i < routes.length; i++) {
          const route = routes[i];
          if (
            route.orderCount === availableOrders.length &&
            route.estimatedTime > bestRouteForAllOrders.estimatedTime
          ) {
            routes[i] = {
              ...bestRouteForAllOrders,
              duration: route.duration,
              durationLabel: route.durationLabel,
            };
          }
        }
      }
    }

    return {
      routes,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 1000), // Routes valid for 30 seconds
      availableOrderCount: availableOrders.length,
    };
  }

  /**
   * Claim a route - assign orders to courier and create active route
   */
  async claimRoute(
    courierId: string,
    dto: ClaimRouteDto,
  ): Promise<CourierRouteDocument> {
    // Get courier earnings percentage for calculating per-order earnings
    const settings = await this.siteSettingsService.getSettings();
    const courierEarningsPercentage = settings.courierEarningsPercentage ?? 0.8;

    // Check if courier already has an active route
    const existingRoute = await this.courierRouteModel.findOne({
      courierId: new Types.ObjectId(courierId),
      status: RouteStatus.ACTIVE,
    });

    if (existingRoute) {
      throw new BadRequestException(
        'You already have an active route. Complete or abandon it first.',
      );
    }

    // Verify all orders are still available
    const orderIds = dto.orderIds.map((id) => new Types.ObjectId(id));
    const orders = await this.orderModel.find({
      _id: { $in: orderIds },
      status: OrderStatus.READY_FOR_DELIVERY,
      $or: [{ courierId: { $exists: false } }, { courierId: null }],
    });

    if (orders.length !== orderIds.length) {
      const foundIds = orders.map((o) => o._id.toString());
      const missingIds = dto.orderIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Some orders are no longer available: ${missingIds.join(', ')}. Please regenerate routes.`,
      );
    }

    // Create route stops from DTO
    const stops: RouteStop[] = dto.stops.map((stop) => {
      const order = stop.orderId
        ? orders.find((o) => o._id.toString() === stop.orderId)
        : null;

      // Get location - for break stops, use the location from DTO; for order stops, use order data
      let location: RouteLocation;
      if (stop.type === 'break' && stop.location) {
        location = {
          address: stop.location.address || 'Break',
          city: stop.location.city || 'N/A',
          coordinates: {
            lat: stop.location.lat,
            lng: stop.location.lng,
          },
        };
      } else {
        location = this.getStopLocation(order, stop.type);
      }

      const routeStop: RouteStop = {
        _id: stop.stopId,
        type:
          stop.type === 'pickup'
            ? StopType.PICKUP
            : stop.type === 'delivery'
              ? StopType.DELIVERY
              : StopType.BREAK,
        status: StopStatus.PENDING,
        location,
        orderId: order ? order._id : undefined,
        contactName:
          stop.type === 'pickup'
            ? order?.pickupStoreName
            : order?.recipientName,
        contactPhone:
          stop.type === 'pickup'
            ? order?.pickupPhoneNumber
            : order?.shippingDetails?.phoneNumber,
        storeName: stop.type === 'pickup' ? order?.pickupStoreName : undefined,
        orderValue: order?.totalPrice,
        courierEarning: order
          ? Math.round(order.shippingPrice * courierEarningsPercentage * 100) /
            100
          : undefined,
        shippingSize: order
          ? this.mapShippingSize(
              order.shippingSize || order.estimatedShippingSize,
            )
          : undefined,
        deliveryDeadline: order?.deliveryDeadline,
        orderItems: order?.orderItems?.map((item) => ({
          name: item.name,
          nameEn: item.nameEn,
          image: item.image,
          qty: item.qty,
          price: item.price,
        })),
        breakDurationMinutes:
          stop.type === 'break' ? TIME_CONSTANTS.BREAK_DURATION : undefined,
      };

      return routeStop;
    });

    // Calculate estimated times
    const now = new Date();
    let currentTime = now;
    let totalDistance = 0;
    let currentLocation = dto.startingPoint;

    for (const stop of stops) {
      const travelTime = await this.getRoutingTime(currentLocation, {
        lat: stop.location.coordinates.lat,
        lng: stop.location.coordinates.lng,
      });

      totalDistance += travelTime.distance;
      // Add travel time to get arrival time
      currentTime = new Date(
        currentTime.getTime() + travelTime.duration * 1000,
      );

      // Set arrival time BEFORE adding handling time
      stop.estimatedArrival = currentTime;

      // Add handling time and rest time for next stop calculation
      if (stop.type === StopType.BREAK) {
        currentTime = new Date(
          currentTime.getTime() + TIME_CONSTANTS.BREAK_DURATION * 60 * 1000,
        );
      } else {
        currentTime = new Date(
          currentTime.getTime() +
            (TIME_CONSTANTS.HANDLING_TIME + TIME_CONSTANTS.REST_TIME_PER_STOP) *
              60 *
              1000,
        );
      }

      currentLocation = {
        lat: stop.location.coordinates.lat,
        lng: stop.location.coordinates.lng,
        address: stop.location.address,
        city: stop.location.city,
      };
    }

    // Calculate earnings
    const estimatedEarnings = await this.calculateRouteEarnings(orders);

    // Create the route
    const route = new this.courierRouteModel({
      courierId: new Types.ObjectId(courierId),
      status: RouteStatus.ACTIVE,
      startingPoint: {
        address: dto.startingPoint.address,
        city: dto.startingPoint.city,
        coordinates: {
          lat: dto.startingPoint.lat,
          lng: dto.startingPoint.lng,
        },
      },
      targetDuration: dto.duration,
      includeBreaks: dto.includeBreaks,
      stops,
      currentStopIndex: 0,
      completedStops: 0,
      estimatedTotalTime: Math.round(
        (currentTime.getTime() - now.getTime()) / 60000,
      ),
      estimatedEndTime: currentTime,
      estimatedDistanceKm: Math.round((totalDistance / 1000) * 10) / 10,
      estimatedEarnings,
      actualEarnings: 0,
      orderIds,
      startedAt: now,
      actualStartTime: now,
    });

    await route.save();

    // Assign orders to courier (status stays READY_FOR_DELIVERY)
    await this.orderModel.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: {
          courierId: new Types.ObjectId(courierId),
          courierAssignedAt: now,
        },
      },
    );

    return route;
  }

  /**
   * Get active route for courier
   */
  async getActiveRoute(
    courierId: string,
  ): Promise<CourierRouteDocument | null> {
    return this.courierRouteModel.findOne({
      courierId: new Types.ObjectId(courierId),
      status: RouteStatus.ACTIVE,
    });
  }

  /**
   * Update route progress
   */
  async updateProgress(
    courierId: string,
    routeId: string,
    stopIndex: number,
    action: 'arrived' | 'completed' | 'skipped',
  ): Promise<CourierRouteDocument> {
    const route = await this.courierRouteModel.findOne({
      _id: new Types.ObjectId(routeId),
      courierId: new Types.ObjectId(courierId),
      status: RouteStatus.ACTIVE,
    });

    if (!route) {
      throw new BadRequestException('Active route not found');
    }

    if (stopIndex < 0 || stopIndex >= route.stops.length) {
      throw new BadRequestException('Invalid stop index');
    }

    const stop = route.stops[stopIndex];

    switch (action) {
      case 'arrived':
        stop.status = StopStatus.ARRIVED;
        stop.actualArrival = new Date();
        break;

      case 'completed':
        stop.status = StopStatus.COMPLETED;
        stop.completedAt = new Date();
        route.completedStops += 1;

        // If this was a delivery, update order status and process earnings
        if (stop.type === StopType.DELIVERY && stop.orderId) {
          const order = await this.orderModel.findByIdAndUpdate(
            stop.orderId,
            {
              status: OrderStatus.DELIVERED,
              isDelivered: true,
              deliveredAt: new Date(),
            },
            { new: true },
          );

          // Process seller and courier earnings
          if (order) {
            await this.balanceService.processOrderEarnings(order);

            // Update route's actual earnings
            route.actualEarnings += stop.courierEarning || 0;
          }
        }

        // If this was a pickup, update order status to shipped
        if (stop.type === StopType.PICKUP && stop.orderId) {
          await this.orderModel.findByIdAndUpdate(stop.orderId, {
            status: OrderStatus.SHIPPED,
            shippedAt: new Date(),
          });
        }

        // Move to next stop
        if (stopIndex === route.currentStopIndex) {
          route.currentStopIndex += 1;
        }
        break;

      case 'skipped':
        stop.status = StopStatus.SKIPPED;
        if (stopIndex === route.currentStopIndex) {
          route.currentStopIndex += 1;
        }
        break;
    }

    // Check if route is complete
    const allStopsProcessed = route.stops.every(
      (s) =>
        s.status === StopStatus.COMPLETED || s.status === StopStatus.SKIPPED,
    );

    if (allStopsProcessed) {
      route.status = RouteStatus.COMPLETED;
      route.completedAt = new Date();
      route.actualEndTime = new Date();
      // actualEarnings is already updated incrementally when each delivery is completed
    }

    await route.save();
    return route;
  }

  /**
   * Handle "can't carry more" - postpone current pickup order
   * The order is moved after the next delivery so courier can make space first
   * Returns { postponed: true } if order was moved, or { nothingInBag: true } if nothing to deliver first
   */
  async cannotCarryMore(
    courierId: string,
    routeId: string,
  ): Promise<{ route: CourierRouteDocument; nothingInBag?: boolean }> {
    const route = await this.courierRouteModel.findOne({
      _id: new Types.ObjectId(routeId),
      courierId: new Types.ObjectId(courierId),
      status: RouteStatus.ACTIVE,
    });

    if (!route) {
      throw new BadRequestException('Active route not found');
    }

    const currentIndex = route.currentStopIndex;
    const currentStop = route.stops[currentIndex];

    // Only works on pickup stops
    if (!currentStop || currentStop.type !== StopType.PICKUP) {
      throw new BadRequestException(
        'Can only use "can\'t carry more" on pickup stops',
      );
    }

    const currentOrderId = currentStop.orderId?.toString();
    if (!currentOrderId) {
      throw new BadRequestException('Current stop has no order');
    }

    // Get remaining stops (from current index onwards, excluding the current pickup)
    const remainingStops = route.stops.slice(currentIndex + 1);

    // Find deliveries for orders that are ALREADY picked up (completed pickup stops before current)
    const completedPickupOrderIds = new Set(
      route.stops
        .slice(0, currentIndex)
        .filter(
          (s) =>
            s.type === StopType.PICKUP &&
            s.status === StopStatus.COMPLETED &&
            s.orderId,
        )
        .map((s) => s.orderId?.toString()),
    );

    // Find pending deliveries for already picked up orders
    const pendingDeliveriesForPickedUpOrders = remainingStops.filter(
      (s) =>
        s.type === StopType.DELIVERY &&
        s.status === StopStatus.PENDING &&
        s.orderId &&
        completedPickupOrderIds.has(s.orderId.toString()),
    );

    // If courier has nothing in the bag (no picked up items waiting to be delivered)
    if (pendingDeliveriesForPickedUpOrders.length === 0) {
      return { route, nothingInBag: true };
    }

    // Find the delivery stop for the current order (the one we're postponing)
    const currentOrderDeliveryIndex = remainingStops.findIndex(
      (s) =>
        s.type === StopType.DELIVERY &&
        s.orderId?.toString() === currentOrderId,
    );

    // Remove current pickup and its delivery from remaining stops
    const currentPickup = currentStop;
    const currentDelivery =
      currentOrderDeliveryIndex >= 0
        ? remainingStops[currentOrderDeliveryIndex]
        : null;

    // Filter out both pickup (already at currentIndex) and delivery for this order
    const filteredRemaining = remainingStops.filter(
      (s) => s.orderId?.toString() !== currentOrderId,
    );

    // Insert the postponed order AFTER the first delivery
    // Position: after firstDelivery in the filtered list
    // We need to recalculate position since we removed elements
    const newFirstDeliveryIndex = filteredRemaining.findIndex(
      (s) =>
        s.type === StopType.DELIVERY &&
        s.status === StopStatus.PENDING &&
        s.orderId &&
        completedPickupOrderIds.has(s.orderId.toString()),
    );

    // Insert pickup and delivery after the first delivery
    const insertPosition =
      newFirstDeliveryIndex >= 0 ? newFirstDeliveryIndex + 1 : 0;

    // Build new remaining stops: insert pickup, then delivery after first delivery
    const newRemainingStops = [...filteredRemaining];
    if (currentDelivery) {
      newRemainingStops.splice(
        insertPosition,
        0,
        currentPickup,
        currentDelivery,
      );
    } else {
      newRemainingStops.splice(insertPosition, 0, currentPickup);
    }

    // Update route stops
    route.stops = [...route.stops.slice(0, currentIndex), ...newRemainingStops];

    await route.save();

    this.logger.log(
      `Postponed order ${currentOrderId} in route ${route._id}. Moved after first delivery.`,
    );

    return { route };
  }

  /**
   * Abandon route - release all undelivered orders
   */
  async abandonRoute(
    courierId: string,
    routeId: string,
    reason?: string,
  ): Promise<CourierRouteDocument> {
    const route = await this.courierRouteModel.findOne({
      _id: new Types.ObjectId(routeId),
      courierId: new Types.ObjectId(courierId),
      status: RouteStatus.ACTIVE,
    });

    if (!route) {
      throw new BadRequestException('Active route not found');
    }

    // Get orders that weren't delivered
    const undeliveredOrderIds = route.stops
      .filter(
        (s) =>
          s.type === StopType.DELIVERY &&
          s.status !== StopStatus.COMPLETED &&
          s.orderId,
      )
      .map((s) => s.orderId)
      .filter((id): id is Types.ObjectId => id !== undefined);

    // Release these orders back to available pool
    if (undeliveredOrderIds.length > 0) {
      await this.orderModel.updateMany(
        { _id: { $in: undeliveredOrderIds } },
        {
          $unset: { courierId: 1, courierAssignedAt: 1 },
          $set: { status: OrderStatus.READY_FOR_DELIVERY },
        },
      );
    }

    route.status = RouteStatus.ABANDONED;
    route.abandonedAt = new Date();
    route.abandonReason = reason;
    route.actualEndTime = new Date();

    await route.save();
    return route;
  }

  /**
   * Remove a specific order from an active route
   * Called when a courier abandons an individual order from the deliveries page
   * Returns null if the order wasn't part of any active route
   */
  async removeOrderFromRoute(
    courierId: string,
    orderId: string,
  ): Promise<CourierRouteDocument | null> {
    const orderObjectId = new Types.ObjectId(orderId);
    const courierObjectId = new Types.ObjectId(courierId);

    // Find active route for this courier that contains this order
    const route = await this.courierRouteModel.findOne({
      courierId: courierObjectId,
      status: RouteStatus.ACTIVE,
      'stops.orderId': orderObjectId,
    });

    if (!route) {
      // Order wasn't part of any active route
      return null;
    }

    // Track the current stop's _id before filtering
    const currentStopId = route.stops[route.currentStopIndex]?._id || null;

    // Count how many stops before the current index will be removed
    const stopsBeforeCurrentToRemove = route.stops
      .slice(0, route.currentStopIndex)
      .filter(
        (stop) => stop.orderId && stop.orderId.toString() === orderId,
      ).length;

    // Count how many completed stops will be removed
    const completedStopsToRemove = route.stops.filter(
      (stop) =>
        stop.orderId &&
        stop.orderId.toString() === orderId &&
        stop.status === StopStatus.COMPLETED,
    ).length;

    // Remove all stops related to this order (both pickup and delivery)
    const originalStopCount = route.stops.length;
    route.stops = route.stops.filter(
      (stop) => !stop.orderId || stop.orderId.toString() !== orderId,
    );

    // Check if route has any remaining delivery stops
    const remainingDeliveryStops = route.stops.filter(
      (s) => s.type === StopType.DELIVERY,
    );

    if (remainingDeliveryStops.length === 0) {
      // No more deliveries - mark route as completed/abandoned
      route.status = RouteStatus.COMPLETED;
      route.completedAt = new Date();
      route.actualEndTime = new Date();
      this.logger.log(
        `Route ${route._id} completed after last order was removed`,
      );
    } else {
      // Update orderIds array - remove the abandoned order
      route.orderIds = route.orderIds.filter(
        (oid) => oid.toString() !== orderId,
      );

      // Recalculate earnings from remaining delivery stops
      route.estimatedEarnings = route.stops
        .filter((s) => s.type === StopType.DELIVERY && s.courierEarning)
        .reduce((sum, s) => sum + (s.courierEarning || 0), 0);

      // Adjust currentStopIndex based on removed stops
      // First check if the current stop itself was removed
      const currentStopStillExists = currentStopId
        ? route.stops.some((s) => s._id === currentStopId)
        : false;

      if (!currentStopStillExists) {
        // Current stop was removed - find the next valid position
        // Subtract the stops removed before the old current position
        route.currentStopIndex = Math.max(
          0,
          route.currentStopIndex - stopsBeforeCurrentToRemove,
        );
        // Clamp to valid range
        if (route.currentStopIndex >= route.stops.length) {
          route.currentStopIndex = Math.max(0, route.stops.length - 1);
        }
      } else {
        // Current stop still exists - just subtract the removed stops before it
        route.currentStopIndex = Math.max(
          0,
          route.currentStopIndex - stopsBeforeCurrentToRemove,
        );
      }

      // Adjust completedStops count
      route.completedStops = Math.max(
        0,
        route.completedStops - completedStopsToRemove,
      );

      this.logger.log(
        `Removed ${originalStopCount - route.stops.length} stops for order ${orderId} from route ${route._id}. ${remainingDeliveryStops.length} deliveries remaining. Current stop index: ${route.currentStopIndex}, Completed stops: ${route.completedStops}`,
      );
    }

    await route.save();
    return route;
  }

  /**
   * Get route history for courier
   */
  async getRouteHistory(
    courierId: string,
    limit = 20,
  ): Promise<CourierRouteDocument[]> {
    return this.courierRouteModel
      .find({
        courierId: new Types.ObjectId(courierId),
        status: { $in: [RouteStatus.COMPLETED, RouteStatus.ABANDONED] },
      })
      .sort({ completedAt: -1, abandonedAt: -1 })
      .limit(limit)
      .exec();
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get max items courier can carry based on vehicle type
   */
  private getMaxItemsForVehicle(vehicleType: string): number {
    const capacities: Record<string, number> = {
      walking: 2,
      bicycle: 3,
      motorcycle: 4,
      car: 6,
      suv: 8,
      van: 12,
    };
    return capacities[vehicleType] || 6;
  }

  /**
   * Get available orders for delivery
   */
  private async getAvailableOrders(
    compatibleSizes: string[],
  ): Promise<OrderDocument[]> {
    return this.orderModel
      .find({
        status: OrderStatus.READY_FOR_DELIVERY,
        $or: [{ courierId: { $exists: false } }, { courierId: null }],
        shippingSize: { $in: compatibleSizes },
        deliveryDeadline: { $gt: new Date() }, // Not overdue
      })
      .limit(200) // Limit for performance
      .exec();
  }

  /**
   * Calculate distances from starting point to each order's pickup and delivery
   * Uses fallback coordinates for orders missing location data
   */
  private async calculateOrderDistances(
    orders: OrderDocument[],
    startingPoint: { lat: number; lng: number },
  ): Promise<OrderWithDistance[]> {
    const ordersWithDistance: OrderWithDistance[] = [];

    // Default Tbilisi center (fallback for missing coordinates)
    const DEFAULT_LAT = 41.7151;
    const DEFAULT_LNG = 44.8271;

    // Valid coordinate bounds for Georgia region
    const VALID_LAT_MIN = 41.0;
    const VALID_LAT_MAX = 43.5;
    const VALID_LNG_MIN = 40.0;
    const VALID_LNG_MAX = 47.0;

    // Helper to validate coordinates
    const isValidCoordinate = (
      coord: { lat: number; lng: number } | undefined,
    ): boolean => {
      if (!coord) return false;
      if (typeof coord.lat !== 'number' || typeof coord.lng !== 'number')
        return false;
      if (isNaN(coord.lat) || isNaN(coord.lng)) return false;
      // Filter out 0,0 (null island) and coordinates outside Georgia region
      if (coord.lat === 0 && coord.lng === 0) return false;
      if (coord.lat < VALID_LAT_MIN || coord.lat > VALID_LAT_MAX) return false;
      if (coord.lng < VALID_LNG_MIN || coord.lng > VALID_LNG_MAX) return false;
      return true;
    };

    for (const order of orders) {
      // Use valid coordinates or fallback to defaults
      const pickupLocation = isValidCoordinate(order.pickupLocation)
        ? { lat: order.pickupLocation!.lat, lng: order.pickupLocation!.lng }
        : { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

      const deliveryLocation = isValidCoordinate(order.deliveryLocation)
        ? { lat: order.deliveryLocation!.lat, lng: order.deliveryLocation!.lng }
        : { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

      // Log warning for orders using fallback coordinates
      if (!isValidCoordinate(order.pickupLocation)) {
        this.logger.warn(
          `Order ${order._id} missing pickup coordinates, using default`,
        );
      }
      if (!isValidCoordinate(order.deliveryLocation)) {
        this.logger.warn(
          `Order ${order._id} missing delivery coordinates, using default`,
        );
      }

      const pickupDistance = this.calculateHaversineDistance(
        startingPoint,
        pickupLocation,
      );
      const deliveryDistance = this.calculateHaversineDistance(
        pickupLocation,
        deliveryLocation,
      );

      ordersWithDistance.push({
        order,
        pickupDistance,
        deliveryDistance,
        pickupLocation,
        deliveryLocation,
      });
    }

    // Sort by pickup distance from starting point
    ordersWithDistance.sort((a, b) => a.pickupDistance - b.pickupDistance);

    return ordersWithDistance;
  }

  /**
   * Build a route for a specific target duration
   */
  private async buildRouteForDuration(
    ordersWithDistance: OrderWithDistance[],
    startingPoint: { lat: number; lng: number; address: string; city: string },
    targetDuration: number,
    maxItems: number,
    includeBreak: boolean,
  ): Promise<RoutePreviewDto | null> {
    // Get courier earnings percentage for calculating per-order earnings
    const settings = await this.siteSettingsService.getSettings();
    const courierEarningsPercentage = settings.courierEarningsPercentage ?? 0.8;

    const stops: AlgorithmStop[] = [];
    const usedOrderIds = new Set<string>();
    let currentLocation = startingPoint;
    let currentTime = 0;
    let currentLoad = 0;
    const ordersInProgress: OrderWithDistance[] = [];

    // Reserve time for break if needed
    const breakTime = includeBreak ? TIME_CONSTANTS.BREAK_DURATION : 0;
    const effectiveTargetDuration = targetDuration - breakTime;

    // Account for the 15% buffer that gets applied at the end
    // If we want finalTime (with buffer) <= targetDuration, then:
    // currentTime * (1 + BUFFER_FACTOR) <= targetDuration
    // currentTime <= targetDuration / (1 + BUFFER_FACTOR)
    const maxAllowedTime =
      effectiveTargetDuration / (1 + TIME_CONSTANTS.BUFFER_FACTOR);

    // Helper to calculate courier earning for an order
    const calculateCourierEarning = (order: OrderDocument): number => {
      return (
        Math.round(order.shippingPrice * courierEarningsPercentage * 100) / 100
      );
    };

    // Helper to check if two locations are the same store (within 50m)
    const isSameStore = (loc1: Location, loc2: Location): boolean => {
      const distance = this.calculateHaversineDistance(loc1, loc2);
      return distance < 0.05; // 50 meters (0.05 km)
    };

    // Helper to get all orders from the same store
    const getOrdersFromSameStore = (
      targetLocation: Location,
    ): OrderWithDistance[] => {
      return ordersWithDistance.filter(
        (o) =>
          !usedOrderIds.has(o.order._id.toString()) &&
          isSameStore(o.pickupLocation, targetLocation),
      );
    };

    // Greedy algorithm with store grouping: pick up all orders from a store when visiting
    while (currentTime < maxAllowedTime * 0.9) {
      // 90% to leave room for remaining deliveries
      let bestStop: AlgorithmStop | null = null;
      let bestOrder: OrderWithDistance | null = null;
      let bestTravelTime = Infinity;
      let isPickup = false;

      // If at capacity, must deliver
      if (currentLoad >= maxItems) {
        // Find nearest delivery
        for (const orderInProgress of ordersInProgress) {
          const travelTime = this.estimateTravelTime(
            currentLocation,
            orderInProgress.deliveryLocation,
          );

          if (travelTime < bestTravelTime) {
            bestTravelTime = travelTime;
            bestOrder = orderInProgress;
            isPickup = false;
            bestStop = this.createDeliveryStop(orderInProgress);
          }
        }
      } else {
        // Consider both pickups and deliveries
        // Check deliveries first (for orders we're carrying)
        for (const orderInProgress of ordersInProgress) {
          const travelTime = this.estimateTravelTime(
            currentLocation,
            orderInProgress.deliveryLocation,
          );

          if (travelTime < bestTravelTime) {
            bestTravelTime = travelTime;
            bestOrder = orderInProgress;
            isPickup = false;
            bestStop = this.createDeliveryStop(orderInProgress);
          }
        }

        // Check pickups - but consider store grouping potential
        for (const orderWithDist of ordersWithDistance) {
          if (usedOrderIds.has(orderWithDist.order._id.toString())) continue;

          const travelTimeToPickup = this.estimateTravelTime(
            currentLocation,
            orderWithDist.pickupLocation,
          );

          // Count how many orders we can pick up from this store
          const ordersAtStore = getOrdersFromSameStore(
            orderWithDist.pickupLocation,
          );
          const availableCapacity = maxItems - currentLoad;
          const ordersToPickup = ordersAtStore.slice(0, availableCapacity);

          // Calculate time needed for all pickups at this store AND their deliveries
          const totalPickupTime =
            travelTimeToPickup +
            ordersToPickup.length *
              (TIME_CONSTANTS.HANDLING_TIME +
                TIME_CONSTANTS.REST_TIME_PER_STOP);

          // Estimate delivery times for all orders we'd pick up
          let estimatedDeliveryTime = 0;
          let lastLoc = orderWithDist.pickupLocation;
          for (const orderToPickup of ordersToPickup) {
            const deliveryTime = this.estimateTravelTime(
              lastLoc,
              orderToPickup.deliveryLocation,
            );
            estimatedDeliveryTime +=
              deliveryTime +
              TIME_CONSTANTS.HANDLING_TIME +
              TIME_CONSTANTS.REST_TIME_PER_STOP;
            lastLoc = orderToPickup.deliveryLocation;
          }

          // Calculate time to deliver ALL orders currently in progress
          let pendingDeliveriesTime = 0;
          for (const inProgressOrder of ordersInProgress) {
            const deliveryTime = this.estimateTravelTime(
              lastLoc,
              inProgressOrder.deliveryLocation,
            );
            pendingDeliveriesTime +=
              deliveryTime +
              TIME_CONSTANTS.HANDLING_TIME +
              TIME_CONSTANTS.REST_TIME_PER_STOP;
            lastLoc = inProgressOrder.deliveryLocation;
          }

          // Only consider this store if we have time for everything
          const totalTimeNeeded =
            totalPickupTime + estimatedDeliveryTime + pendingDeliveriesTime;
          if (currentTime + totalTimeNeeded > maxAllowedTime) continue;

          // Favor stores with more orders (amortize travel cost)
          // Divide travel time by number of orders to get "cost per order"
          const effectiveTravelTime =
            travelTimeToPickup / Math.max(1, ordersToPickup.length);

          if (effectiveTravelTime < bestTravelTime) {
            bestTravelTime = effectiveTravelTime;
            bestOrder = orderWithDist;
            isPickup = true;
            bestStop = this.createPickupStop(orderWithDist);
          }
        }
      }

      if (!bestStop || !bestOrder) break;

      if (isPickup) {
        // STORE GROUPING: Pick up ALL orders from this store (up to capacity)
        const ordersAtStore = getOrdersFromSameStore(bestOrder.pickupLocation);
        const availableCapacity = maxItems - currentLoad;
        const ordersToPickup = ordersAtStore.slice(0, availableCapacity);

        // Calculate travel time to store (only once for all pickups)
        const travelTimeToStore = this.estimateTravelTime(
          currentLocation,
          bestOrder.pickupLocation,
        );

        // Add all pickup stops at this store
        for (let i = 0; i < ordersToPickup.length; i++) {
          const orderToPickup = ordersToPickup[i];
          const pickupStop = this.createPickupStop(orderToPickup);
          pickupStop.courierEarning = calculateCourierEarning(
            orderToPickup.order,
          );

          stops.push(pickupStop);

          // Only add travel time for first pickup; others are at same location
          const stopTime =
            (i === 0 ? travelTimeToStore : 0) +
            TIME_CONSTANTS.HANDLING_TIME +
            TIME_CONSTANTS.REST_TIME_PER_STOP;

          currentTime += stopTime;
          usedOrderIds.add(orderToPickup.order._id.toString());
          ordersInProgress.push(orderToPickup);
          currentLoad += 1;
        }

        // Update current location to store
        currentLocation = {
          ...bestOrder.pickupLocation,
          address: bestOrder.order.pickupAddress || '',
          city: bestOrder.order.pickupCity || '',
        };
      } else {
        // Delivery - same as before
        const stopTime =
          bestTravelTime +
          TIME_CONSTANTS.HANDLING_TIME +
          TIME_CONSTANTS.REST_TIME_PER_STOP;

        if (currentTime + stopTime > maxAllowedTime) break;

        bestStop.courierEarning = calculateCourierEarning(bestOrder.order);
        stops.push(bestStop);
        currentTime += stopTime;

        const bestOrderId = bestOrder.order._id.toString();
        const idx = ordersInProgress.findIndex(
          (o) => o.order._id.toString() === bestOrderId,
        );
        if (idx >= 0) ordersInProgress.splice(idx, 1);
        currentLoad -= 1;
        currentLocation = {
          ...bestOrder.deliveryLocation,
          address: bestOrder.order.shippingDetails.address,
          city: bestOrder.order.shippingDetails.city,
        };
      }
    }

    // Deliver remaining orders
    while (ordersInProgress.length > 0) {
      let nearestOrder: OrderWithDistance | null = null;
      let nearestTime = Infinity;

      for (const orderInProgress of ordersInProgress) {
        const travelTime = this.estimateTravelTime(
          currentLocation,
          orderInProgress.deliveryLocation,
        );

        if (travelTime < nearestTime) {
          nearestTime = travelTime;
          nearestOrder = orderInProgress;
        }
      }

      if (nearestOrder) {
        const deliveryStop = this.createDeliveryStop(nearestOrder);
        deliveryStop.courierEarning = calculateCourierEarning(
          nearestOrder.order,
        );
        stops.push(deliveryStop);
        currentTime +=
          nearestTime +
          TIME_CONSTANTS.HANDLING_TIME +
          TIME_CONSTANTS.REST_TIME_PER_STOP;

        const nearestOrderId = nearestOrder.order._id.toString();
        const idx = ordersInProgress.findIndex(
          (o) => o.order._id.toString() === nearestOrderId,
        );
        if (idx >= 0) ordersInProgress.splice(idx, 1);

        currentLocation = {
          ...nearestOrder.deliveryLocation,
          address: nearestOrder.order.shippingDetails.address,
          city: nearestOrder.order.shippingDetails.city,
        };
      }
    }

    if (stops.length === 0) return null;

    // Insert break if needed
    if (includeBreak && stops.length >= 4) {
      const midPoint = Math.floor(stops.length / 2);
      const breakStop: AlgorithmStop = {
        id: uuidv4(),
        orderId: undefined as unknown as Types.ObjectId,
        type: StopType.BREAK,
        location: stops[midPoint - 1].location,
        address: 'Break',
        city: stops[midPoint - 1].city || 'N/A',
      };
      stops.splice(midPoint, 0, breakStop);
      currentTime += TIME_CONSTANTS.BREAK_DURATION;
    }

    // Calculate total distance and earnings
    const uniqueOrderIds = [...usedOrderIds];
    const earnings = await this.calculateEarningsFromOrderIds(
      uniqueOrderIds.map((id) => new Types.ObjectId(id)),
    );
    const totalDistance = this.calculateRouteDistance(startingPoint, stops);

    // Apply buffer
    const finalTime = Math.round(
      currentTime * (1 + TIME_CONSTANTS.BUFFER_FACTOR),
    );

    // Convert stops to preview format
    const now = new Date();
    let estimatedTime = now;
    let prevLocation = { lat: startingPoint.lat, lng: startingPoint.lng };
    const previewStops: RouteStopPreviewDto[] = stops.map((stop) => {
      // Calculate travel time from previous location to this stop
      const travelMinutes = this.estimateTravelTime(
        prevLocation,
        stop.location,
      );

      // Add travel time to get arrival time at this stop
      estimatedTime = new Date(
        estimatedTime.getTime() + travelMinutes * 60 * 1000,
      );

      // Store arrival time before adding handling time
      const arrivalTime = new Date(estimatedTime);

      // Add handling time and rest time for next stop calculation
      if (stop.type === StopType.BREAK) {
        estimatedTime = new Date(
          estimatedTime.getTime() + TIME_CONSTANTS.BREAK_DURATION * 60 * 1000,
        );
      } else {
        estimatedTime = new Date(
          estimatedTime.getTime() +
            (TIME_CONSTANTS.HANDLING_TIME + TIME_CONSTANTS.REST_TIME_PER_STOP) *
              60 *
              1000,
        );
      }

      // Update previous location for next iteration
      prevLocation = stop.location;

      return {
        stopId: stop.id,
        orderId: stop.orderId?.toString(),
        type:
          stop.type === StopType.PICKUP
            ? ('pickup' as const)
            : stop.type === StopType.DELIVERY
              ? ('delivery' as const)
              : ('break' as const),
        address: stop.address,
        city: stop.city,
        coordinates: stop.location,
        estimatedArrival: arrivalTime.toISOString(),
        storeName: stop.storeName,
        contactName: stop.contactName,
        contactPhone: stop.contactPhone,
        orderValue: stop.orderValue,
        courierEarning: stop.courierEarning,
        shippingSize: stop.shippingSize,
        deliveryDeadline: stop.deliveryDeadline?.toISOString(),
        orderItems: stop.orderItems,
        breakDurationMinutes:
          stop.type === StopType.BREAK
            ? TIME_CONSTANTS.BREAK_DURATION
            : undefined,
      };
    });

    return {
      duration: targetDuration,
      durationLabel: this.formatDuration(targetDuration),
      stops: previewStops,
      orderCount: uniqueOrderIds.length,
      estimatedEarnings: earnings,
      estimatedTime: finalTime,
      estimatedDistanceKm: Math.round(totalDistance * 10) / 10,
    };
  }

  /**
   * Create pickup stop from order
   */
  private createPickupStop(orderWithDist: OrderWithDistance): AlgorithmStop {
    const order = orderWithDist.order;
    return {
      id: uuidv4(),
      orderId: order._id,
      type: StopType.PICKUP,
      location: orderWithDist.pickupLocation,
      address: order.pickupAddress || order.orderItems[0]?.storeName || '',
      city: order.pickupCity || '',
      contactName: order.pickupStoreName,
      contactPhone: order.pickupPhoneNumber,
      storeName: order.pickupStoreName,
      orderValue: order.totalPrice,
      shippingSize: this.mapShippingSize(
        order.shippingSize || order.estimatedShippingSize,
      ),
      deliveryDeadline: order.deliveryDeadline,
      orderItems: order.orderItems.map((item) => ({
        name: item.name,
        nameEn: item.nameEn,
        image: item.image,
        qty: item.qty,
        price: item.price,
      })),
    };
  }

  /**
   * Create delivery stop from order
   */
  private createDeliveryStop(orderWithDist: OrderWithDistance): AlgorithmStop {
    const order = orderWithDist.order;
    return {
      id: uuidv4(),
      orderId: order._id,
      type: StopType.DELIVERY,
      location: orderWithDist.deliveryLocation,
      address: order.shippingDetails.address,
      city: order.shippingDetails.city,
      contactName: order.recipientName,
      contactPhone: order.shippingDetails.phoneNumber,
      orderValue: order.totalPrice,
      shippingSize: this.mapShippingSize(
        order.shippingSize || order.estimatedShippingSize,
      ),
      deliveryDeadline: order.deliveryDeadline,
      orderItems: order.orderItems.map((item) => ({
        name: item.name,
        nameEn: item.nameEn,
        image: item.image,
        qty: item.qty,
        price: item.price,
      })),
    };
  }

  /**
   * Map order shipping size to simplified route shipping size
   */
  private mapShippingSize(
    size?: string,
  ): 'regular' | 'large' | 'xl' | undefined {
    switch (size) {
      case 'small':
      case 'medium':
        return 'regular';
      case 'large':
        return 'large';
      case 'extra_large':
        return 'xl';
      default:
        return undefined;
    }
  }

  /**
   * Estimate travel time between two locations (in minutes)
   */
  private estimateTravelTime(from: Location, to: Location): number {
    const distance = this.calculateHaversineDistance(from, to);
    // Assume average speed of 30 km/h in city
    return (distance / 30) * 60;
  }

  /**
   * Calculate Haversine distance between two points (in km)
   */
  private calculateHaversineDistance(from: Location, to: Location): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(to.lat - from.lat);
    const dLon = this.toRad(to.lng - from.lng);
    const lat1 = this.toRad(from.lat);
    const lat2 = this.toRad(to.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get routing time using API (with caching)
   */
  private async getRoutingTime(
    from: Location,
    to: Location,
  ): Promise<{ duration: number; distance: number }> {
    const cacheKey = `${from.lat},${from.lng}-${to.lat},${to.lng}`;
    const cached = this.distanceCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Use Haversine as fallback
    const distance = this.calculateHaversineDistance(from, to) * 1000; // in meters
    const duration = (distance / 1000 / 30) * 3600; // seconds at 30km/h

    const result = { duration, distance };
    this.distanceCache.set(cacheKey, result);

    return result;
  }

  /**
   * Get stop location from order
   */
  private getStopLocation(
    order: OrderDocument | null | undefined,
    type: string,
  ): RouteLocation {
    if (!order) {
      // Break stop - use placeholder values (actual location set by previous stop context)
      return {
        address: 'Break',
        city: 'N/A',
        coordinates: { lat: 0, lng: 0 },
      };
    }

    if (type === 'pickup') {
      return {
        address: order.pickupAddress || 'Unknown Address',
        city: order.pickupCity || 'Unknown City',
        coordinates: {
          lat: order.pickupLocation?.lat ?? 0,
          lng: order.pickupLocation?.lng ?? 0,
        },
      };
    }

    return {
      address: order.shippingDetails?.address || 'Unknown Address',
      city: order.shippingDetails?.city || 'Unknown City',
      coordinates: {
        lat: order.deliveryLocation?.lat ?? 0,
        lng: order.deliveryLocation?.lng ?? 0,
      },
    };
  }

  /**
   * Calculate total route distance
   */
  private calculateRouteDistance(
    startingPoint: Location,
    stops: AlgorithmStop[],
  ): number {
    let total = 0;
    let current = startingPoint;

    for (const stop of stops) {
      total += this.calculateHaversineDistance(current, stop.location);
      current = stop.location;
    }

    return total;
  }

  /**
   * Calculate route earnings
   * Applies courier earnings percentage (commission deduction)
   */
  private async calculateRouteEarnings(
    orders: OrderDocument[],
  ): Promise<number> {
    // Get courier earnings percentage from settings (default 80%)
    const settings = await this.siteSettingsService.getSettings();
    const courierEarningsPercentage = settings.courierEarningsPercentage ?? 0.8;

    // Sum up shipping prices and apply commission
    const totalShipping = orders.reduce(
      (sum, order) => sum + (order.shippingPrice || 0),
      0,
    );

    // Courier receives courierEarningsPercentage of shipping (e.g., 80%)
    return Math.round(totalShipping * courierEarningsPercentage * 100) / 100;
  }

  /**
   * Calculate earnings from order IDs
   */
  private async calculateEarningsFromOrderIds(
    orderIds: Types.ObjectId[],
  ): Promise<number> {
    const orders = await this.orderModel.find({ _id: { $in: orderIds } });
    return this.calculateRouteEarnings(orders);
  }

  /**
   * Format duration for display
   */
  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }
}
