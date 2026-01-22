import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { SiteSettingsService } from '../admin/site-settings.service';
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
  REST_TIME_PER_STOP: 10, // Rest time per stop
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
      courierId: { $exists: false },
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

      const routeStop: RouteStop = {
        _id: stop.stopId,
        type:
          stop.type === 'pickup'
            ? StopType.PICKUP
            : stop.type === 'delivery'
              ? StopType.DELIVERY
              : StopType.BREAK,
        status: StopStatus.PENDING,
        location: this.getStopLocation(order, stop.type),
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
      currentTime = new Date(
        currentTime.getTime() + travelTime.duration * 1000,
      );

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

      stop.estimatedArrival = currentTime;
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

    // Assign orders to courier
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

        // If this was a delivery, update order status
        if (stop.type === StopType.DELIVERY && stop.orderId) {
          await this.orderModel.findByIdAndUpdate(stop.orderId, {
            status: OrderStatus.DELIVERED,
            isDelivered: true,
            deliveredAt: new Date(),
          });
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
      route.actualEarnings = route.estimatedEarnings; // TODO: Calculate actual
    }

    await route.save();
    return route;
  }

  /**
   * Handle "can't carry more" - reorder remaining stops
   * Prioritize deliveries over pickups
   */
  async cannotCarryMore(
    courierId: string,
    routeId: string,
  ): Promise<CourierRouteDocument> {
    const route = await this.courierRouteModel.findOne({
      _id: new Types.ObjectId(routeId),
      courierId: new Types.ObjectId(courierId),
      status: RouteStatus.ACTIVE,
    });

    if (!route) {
      throw new BadRequestException('Active route not found');
    }

    // Get remaining stops (from current index onwards)
    const currentIndex = route.currentStopIndex;
    const remainingStops = route.stops.slice(currentIndex);

    // Separate deliveries and pickups
    const deliveries = remainingStops.filter(
      (s) => s.type === StopType.DELIVERY && s.status === StopStatus.PENDING,
    );
    const pickups = remainingStops.filter(
      (s) => s.type === StopType.PICKUP && s.status === StopStatus.PENDING,
    );
    const breaks = remainingStops.filter(
      (s) => s.type === StopType.BREAK && s.status === StopStatus.PENDING,
    );

    // Reorder: deliveries first, then pickups, breaks distributed
    const reorderedRemaining = [...deliveries, ...pickups];
    if (breaks.length > 0 && reorderedRemaining.length > 2) {
      // Insert break in the middle
      const midPoint = Math.floor(reorderedRemaining.length / 2);
      reorderedRemaining.splice(midPoint, 0, ...breaks);
    }

    // Update route stops
    route.stops = [
      ...route.stops.slice(0, currentIndex),
      ...reorderedRemaining,
    ];

    await route.save();
    return route;
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
        courierId: { $exists: false },
        shippingSize: { $in: compatibleSizes },
        deliveryDeadline: { $gt: new Date() }, // Not overdue
      })
      .limit(200) // Limit for performance
      .exec();
  }

  /**
   * Calculate distances from starting point to each order's pickup and delivery
   */
  private async calculateOrderDistances(
    orders: OrderDocument[],
    startingPoint: { lat: number; lng: number },
  ): Promise<OrderWithDistance[]> {
    const ordersWithDistance: OrderWithDistance[] = [];

    // Default Tbilisi center (fallback only)
    const DEFAULT_LAT = 41.7151;
    const DEFAULT_LNG = 44.8271;

    for (const order of orders) {
      // Use actual coordinates from order, falling back to defaults if missing
      const pickupLocation = {
        lat: order.pickupLocation?.lat ?? DEFAULT_LAT,
        lng: order.pickupLocation?.lng ?? DEFAULT_LNG,
      };

      const deliveryLocation = {
        lat: order.deliveryLocation?.lat ?? DEFAULT_LAT,
        lng: order.deliveryLocation?.lng ?? DEFAULT_LNG,
      };

      // Log warning if using fallback coordinates
      if (!order.pickupLocation?.lat || !order.pickupLocation?.lng) {
        this.logger.warn(
          `Order ${order._id} missing pickup coordinates, using default`,
        );
      }
      if (!order.deliveryLocation?.lat || !order.deliveryLocation?.lng) {
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

    // For shorter routes (1h), be more lenient to include orders
    // Allow up to 105% of target for 1h routes, 100% for longer routes
    const targetThreshold = targetDuration <= 60 ? 1.05 : 1.0;
    const maxAllowedTime = effectiveTargetDuration * targetThreshold;

    // Helper to calculate courier earning for an order
    const calculateCourierEarning = (order: OrderDocument): number => {
      return (
        Math.round(order.shippingPrice * courierEarningsPercentage * 100) / 100
      );
    };

    // Greedy algorithm: always pick the nearest valid stop
    while (currentTime < effectiveTargetDuration * 0.9) {
      // 90% to leave buffer
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

        // Check pickups
        for (const orderWithDist of ordersWithDistance) {
          if (usedOrderIds.has(orderWithDist.order._id.toString())) continue;

          const travelTime = this.estimateTravelTime(
            currentLocation,
            orderWithDist.pickupLocation,
          );

          // Slightly favor pickups to fill capacity
          const adjustedTravelTime = travelTime * 1.1;

          if (adjustedTravelTime < bestTravelTime) {
            bestTravelTime = travelTime;
            bestOrder = orderWithDist;
            isPickup = true;
            bestStop = this.createPickupStop(orderWithDist);
          }
        }
      }

      if (!bestStop || !bestOrder) break;

      // Add time for this stop
      const stopTime =
        bestTravelTime +
        TIME_CONSTANTS.HANDLING_TIME +
        TIME_CONSTANTS.REST_TIME_PER_STOP;

      if (currentTime + stopTime > maxAllowedTime) break;

      // Add courier earning to the stop
      bestStop.courierEarning = calculateCourierEarning(bestOrder.order);

      // Add the stop
      stops.push(bestStop);
      currentTime += stopTime;

      if (isPickup) {
        usedOrderIds.add(bestOrder.order._id.toString());
        ordersInProgress.push(bestOrder);
        currentLoad += 1;
        currentLocation = {
          ...bestOrder.pickupLocation,
          address: bestOrder.order.pickupAddress || '',
          city: bestOrder.order.pickupCity || '',
        };
      } else {
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
        city: '',
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
    const previewStops: RouteStopPreviewDto[] = stops.map((stop) => {
      const travelMinutes = this.estimateTravelTime(
        {
          lat: estimatedTime ? stop.location.lat : startingPoint.lat,
          lng: estimatedTime ? stop.location.lng : startingPoint.lng,
        },
        stop.location,
      );
      estimatedTime = new Date(
        estimatedTime.getTime() +
          (travelMinutes +
            TIME_CONSTANTS.HANDLING_TIME +
            TIME_CONSTANTS.REST_TIME_PER_STOP) *
            60 *
            1000,
      );

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
        estimatedArrival: estimatedTime.toISOString(),
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
      return {
        address: 'Break',
        city: '',
        coordinates: { lat: 0, lng: 0 },
      };
    }

    if (type === 'pickup') {
      return {
        address: order.pickupAddress || '',
        city: order.pickupCity || '',
        coordinates: { lat: 41.7151, lng: 44.8271 }, // Placeholder
      };
    }

    return {
      address: order.shippingDetails.address,
      city: order.shippingDetails.city,
      coordinates: { lat: 41.7151, lng: 44.8271 }, // Placeholder
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
