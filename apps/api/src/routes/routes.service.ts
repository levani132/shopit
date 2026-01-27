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
  RouteCache,
  RouteCacheDocument,
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
import { findBestOrderSubset } from './optimal-route.algorithm';

/**
 * Time constants for route calculations (in minutes)
 */
const TIME_CONSTANTS = {
  HANDLING_TIME: 5, // Time to pick up or deliver an order
  REST_TIME_PER_STOP: 3, // Extra time between stops (parking, walking, etc.)
  BREAK_DURATION: 30, // Break duration for long routes
  BUFFER_FACTOR: 0.08, // 8% buffer for unexpected delays
};

/**
 * Target durations for route generation (in minutes)
 */
const TARGET_DURATIONS = [60, 120, 180, 240, 300, 360, 420, 480];

/**
 * Cache constants for route caching
 */
const CACHE_CONSTANTS = {
  STALE_LOCK_TIMEOUT_MS: 2 * 60 * 1000, // 2 minutes - if generation takes longer, consider lock stale
  POLL_INTERVAL_MS: 500, // How often to check if generation completed
  MAX_POLL_ATTEMPTS: 240, // Max 2 minutes of polling (240 * 500ms)
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes cache TTL for extra safety
};

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
    @InjectModel(RouteCache.name)
    private routeCacheModel: Model<RouteCacheDocument>,
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

  // ==================== CACHE METHODS ====================

  /**
   * Invalidate route caches for all couriers
   * Called when orders become available, are cancelled, or are delivered
   */
  async invalidateAllCaches(): Promise<void> {
    this.logger.log('Invalidating all route caches');
    await this.routeCacheModel.updateMany(
      {},
      { $set: { needsRevalidation: true } },
    );
  }

  /**
   * Invalidate route cache for a specific courier
   * Called when courier takes/abandons orders
   */
  async invalidateCourierCache(courierId: string): Promise<void> {
    this.logger.log(`Invalidating route cache for courier ${courierId}`);
    await this.routeCacheModel.updateOne(
      { courierId: new Types.ObjectId(courierId) },
      { $set: { needsRevalidation: true } },
    );
  }

  /**
   * Helper to check if two locations are approximately equal
   */
  private locationsMatch(
    loc1?: { lat: number; lng: number },
    loc2?: { lat: number; lng: number },
  ): boolean {
    if (!loc1 || !loc2) return false;
    // Consider locations equal if within ~100 meters
    const threshold = 0.001;
    return (
      Math.abs(loc1.lat - loc2.lat) < threshold &&
      Math.abs(loc1.lng - loc2.lng) < threshold
    );
  }

  /**
   * Sleep helper for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get or create cache entry for a courier
   */
  private async getOrCreateCacheEntry(
    courierId: string,
  ): Promise<RouteCacheDocument> {
    const courierObjectId = new Types.ObjectId(courierId);

    let cache = await this.routeCacheModel.findOne({
      courierId: courierObjectId,
    });

    if (!cache) {
      cache = await this.routeCacheModel.create({
        courierId: courierObjectId,
        needsRevalidation: true,
        isGenerating: false,
        version: 0,
      });
    }

    return cache;
  }

  /**
   * Try to acquire the generation lock
   * Returns true if lock acquired, false otherwise
   */
  private async tryAcquireLock(
    cacheId: Types.ObjectId,
    currentVersion: number,
  ): Promise<boolean> {
    const result = await this.routeCacheModel.updateOne(
      {
        _id: cacheId,
        version: currentVersion,
        isGenerating: false,
      },
      {
        $set: {
          isGenerating: true,
          generationStartedAt: new Date(),
        },
        $inc: { version: 1 },
      },
    );
    return result.modifiedCount === 1;
  }

  /**
   * Try to take over a stale lock
   */
  private async tryTakeoverStaleLock(
    cacheId: Types.ObjectId,
    currentVersion: number,
  ): Promise<boolean> {
    const result = await this.routeCacheModel.updateOne(
      {
        _id: cacheId,
        version: currentVersion,
      },
      {
        $set: {
          isGenerating: true,
          generationStartedAt: new Date(),
        },
        $inc: { version: 1 },
      },
    );
    return result.modifiedCount === 1;
  }

  /**
   * Release the generation lock and save cache data
   */
  private async releaseLockAndSaveCache(
    courierId: string,
    routesData: {
      routes: RoutePreviewDto[];
      generatedAt: Date;
      expiresAt: Date;
      availableOrderCount: number;
    },
    vehicleType: string,
    startingLocation: { lat: number; lng: number },
    includeBreaks: boolean,
  ): Promise<void> {
    await this.routeCacheModel.updateOne(
      { courierId: new Types.ObjectId(courierId) },
      {
        $set: {
          isGenerating: false,
          needsRevalidation: false,
          lastGeneratedAt: new Date(),
          cachedData: {
            routes: routesData.routes,
            generatedAt: routesData.generatedAt,
            expiresAt: routesData.expiresAt,
            availableOrderCount: routesData.availableOrderCount,
            vehicleType,
            startingLocation,
            includeBreaks,
          },
        },
        $inc: { version: 1 },
      },
    );
  }

  /**
   * Release lock on error without saving data
   */
  private async releaseLockOnError(courierId: string): Promise<void> {
    await this.routeCacheModel.updateOne(
      { courierId: new Types.ObjectId(courierId) },
      {
        $set: { isGenerating: false },
        $inc: { version: 1 },
      },
    );
  }

  // ==================== END CACHE METHODS ====================

  /**
   * Generate route options for different durations
   * Uses caching to avoid regenerating routes unnecessarily
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
    const includeBreaks = Boolean(dto.includeBreaks);

    // ==================== CACHE CHECK ====================
    let cache = await this.getOrCreateCacheEntry(courierId);
    const startingLocation = dto.startingPoint;

    // Check if we have valid cached data
    if (
      !cache.needsRevalidation &&
      cache.cachedData &&
      cache.cachedData.vehicleType === vehicleType &&
      Boolean(cache.cachedData.includeBreaks) === includeBreaks &&
      this.locationsMatch(cache.cachedData.startingLocation, startingLocation)
    ) {
      this.logger.log(`Returning cached routes for courier ${courierId}`);
      return {
        routes: cache.cachedData.routes as RoutePreviewDto[],
        generatedAt: cache.cachedData.generatedAt,
        expiresAt: cache.cachedData.expiresAt,
        availableOrderCount: cache.cachedData.availableOrderCount,
      };
    }

    // Try to acquire generation lock
    let pollAttempts = 0;
    while (pollAttempts < CACHE_CONSTANTS.MAX_POLL_ATTEMPTS) {
      // Refresh cache state
      const refreshedCache = await this.routeCacheModel.findOne({
        courierId: new Types.ObjectId(courierId),
      });
      if (!refreshedCache) {
        // Cache was deleted, recreate it
        cache = await this.getOrCreateCacheEntry(courierId);
      } else {
        cache = refreshedCache;
      }

      if (!cache.isGenerating) {
        // Try to acquire lock
        const acquired = await this.tryAcquireLock(
          cache._id as Types.ObjectId,
          cache.version,
        );
        if (acquired) {
          this.logger.log(`Acquired generation lock for courier ${courierId}`);
          break;
        }
      } else {
        // Check if lock is stale
        const lockAge = cache.generationStartedAt
          ? Date.now() - cache.generationStartedAt.getTime()
          : Infinity;

        if (lockAge > CACHE_CONSTANTS.STALE_LOCK_TIMEOUT_MS) {
          // Try to take over stale lock
          const takenOver = await this.tryTakeoverStaleLock(
            cache._id as Types.ObjectId,
            cache.version,
          );
          if (takenOver) {
            this.logger.log(`Took over stale lock for courier ${courierId}`);
            break;
          }
        }
      }

      // Wait and check if generation completed
      await this.sleep(CACHE_CONSTANTS.POLL_INTERVAL_MS);
      pollAttempts++;

      // Check if cache is now valid after waiting
      const updatedCache = await this.routeCacheModel.findOne({
        courierId: new Types.ObjectId(courierId),
      });
      if (
        updatedCache &&
        !updatedCache.needsRevalidation &&
        updatedCache.cachedData &&
        updatedCache.cachedData.vehicleType === vehicleType &&
        Boolean(updatedCache.cachedData.includeBreaks) === includeBreaks &&
        this.locationsMatch(
          updatedCache.cachedData.startingLocation,
          startingLocation,
        )
      ) {
        this.logger.log(
          `Returning freshly generated cached routes for courier ${courierId}`,
        );
        return {
          routes: updatedCache.cachedData.routes as RoutePreviewDto[],
          generatedAt: updatedCache.cachedData.generatedAt,
          expiresAt: updatedCache.cachedData.expiresAt,
          availableOrderCount: updatedCache.cachedData.availableOrderCount,
        };
      }
    }

    // We have the lock (or timed out trying) - proceed with generation
    this.logger.log(`Generating routes for courier ${courierId}`);

    try {
      const routesData = await this._generateRoutesInternal(
        courierId,
        dto,
        vehicleType,
      );

      // Save to cache and release lock
      await this.releaseLockAndSaveCache(
        courierId,
        routesData,
        vehicleType,
        startingLocation,
        includeBreaks,
      );

      return routesData;
    } catch (error) {
      // Release lock on error
      await this.releaseLockOnError(courierId);
      throw error;
    }
  }

  /**
   * Internal route generation logic (previously generateRoutes body)
   */
  private async _generateRoutesInternal(
    courierId: string,
    dto: GenerateRoutesDto,
    vehicleType: string,
  ): Promise<{
    routes: RoutePreviewDto[];
    generatedAt: Date;
    expiresAt: Date;
    availableOrderCount: number;
  }> {
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

    // Check which algorithm to use: DTO param takes precedence, then settings
    let useOptimalAlgorithm = false;
    if (dto.algorithm) {
      useOptimalAlgorithm = dto.algorithm === 'optimal';
    } else {
      const settings = await this.siteSettingsService.getSettings();
      useOptimalAlgorithm = settings.routeAlgorithm === 'optimal';
    }

    // Generate routes for each target duration
    const routes: RoutePreviewDto[] = [];

    for (const targetDuration of TARGET_DURATIONS) {
      let route: RoutePreviewDto | null;

      if (useOptimalAlgorithm) {
        // Use optimal algorithm (Held-Karp/Branch-and-Bound)
        route = await this.buildOptimalRouteForDuration(
          availableOrders,
          ordersWithDistance,
          dto.startingPoint,
          targetDuration,
          maxItems,
          Boolean(dto.includeBreaks && targetDuration >= 240), // Include breaks for 4h+ routes
        );
      } else {
        // Use heuristic algorithm (default)
        route = await this.buildRouteForDuration(
          ordersWithDistance,
          dto.startingPoint,
          targetDuration,
          maxItems,
          Boolean(dto.includeBreaks && targetDuration >= 240), // Include breaks for 4h+ routes
        );
      }

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

    // Invalidate caches - orders are now taken
    await this.invalidateAllCaches();

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
    const now = new Date();

    switch (action) {
      case 'arrived':
        stop.status = StopStatus.ARRIVED;
        stop.actualArrival = now;
        // Start handling time tracking
        stop.handlingStartedAt = now;
        break;

      case 'completed':
        stop.status = StopStatus.COMPLETED;
        stop.completedAt = now;
        route.completedStops += 1;

        // Calculate handling time if we have a start time
        if (stop.handlingStartedAt) {
          const handlingMs = now.getTime() - stop.handlingStartedAt.getTime();
          stop.handlingTimeMinutes = Math.round(handlingMs / 60000);
        } else if (stop.actualArrival) {
          // Fallback: use arrival time if handlingStartedAt not set
          const handlingMs = now.getTime() - stop.actualArrival.getTime();
          stop.handlingTimeMinutes = Math.round(handlingMs / 60000);
        }

        // If this was a delivery, update order status and process earnings
        if (stop.type === StopType.DELIVERY && stop.orderId) {
          const order = await this.orderModel.findByIdAndUpdate(
            stop.orderId,
            {
              status: OrderStatus.DELIVERED,
              isDelivered: true,
              deliveredAt: now,
              deliveredFromRouteId: route._id,
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

        // If this was a pickup, update order status to shipped with pickup tracking
        if (stop.type === StopType.PICKUP && stop.orderId) {
          await this.orderModel.findByIdAndUpdate(stop.orderId, {
            status: OrderStatus.SHIPPED,
            shippedAt: now,
            pickedUpAt: now,
            pickedUpFromRouteId: route._id,
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
      route.completedAt = now;
      route.actualEndTime = now;
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

    // Invalidate caches - orders are back in available pool
    await this.invalidateAllCaches();

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

    // Invalidate caches - order is back in available pool
    await this.invalidateAllCaches();

    return route;
  }

  /**
   * Mark order as picked up in an active route
   * Called when courier marks order as shipped via deliveries page
   */
  async markOrderPickedUpInRoute(
    courierId: string,
    orderId: string,
  ): Promise<void> {
    const orderObjectId = new Types.ObjectId(orderId);
    const courierObjectId = new Types.ObjectId(courierId);

    const route = await this.courierRouteModel.findOne({
      courierId: courierObjectId,
      status: RouteStatus.ACTIVE,
      'stops.orderId': orderObjectId,
    });

    if (!route) {
      return; // Order not part of any active route
    }

    const now = new Date();
    let updated = false;

    // Find and mark pickup stop as completed
    for (const stop of route.stops) {
      if (
        stop.orderId?.toString() === orderId &&
        stop.type === StopType.PICKUP &&
        stop.status !== StopStatus.COMPLETED
      ) {
        stop.status = StopStatus.COMPLETED;
        stop.completedAt = now;
        stop.actualArrival = stop.actualArrival || now;
        route.completedStops += 1;
        updated = true;
        break;
      }
    }

    if (updated) {
      // Recalculate remaining arrival times
      await this.recalculateRemainingArrivalTimes(route);
      await route.save();
      this.logger.log(
        `Marked pickup for order ${orderId} as completed in route ${route._id}`,
      );
    }
  }

  /**
   * Mark order as delivered in an active route
   * Called when courier marks order as delivered via deliveries page
   */
  async markOrderDeliveredInRoute(
    courierId: string,
    orderId: string,
  ): Promise<void> {
    const orderObjectId = new Types.ObjectId(orderId);
    const courierObjectId = new Types.ObjectId(courierId);

    const route = await this.courierRouteModel.findOne({
      courierId: courierObjectId,
      status: RouteStatus.ACTIVE,
      'stops.orderId': orderObjectId,
    });

    if (!route) {
      return; // Order not part of any active route
    }

    const now = new Date();
    let pickupCompleted = false;
    let deliveryCompleted = false;

    // Mark both pickup and delivery stops as completed
    for (const stop of route.stops) {
      if (stop.orderId?.toString() !== orderId) continue;

      if (
        stop.type === StopType.PICKUP &&
        stop.status !== StopStatus.COMPLETED
      ) {
        stop.status = StopStatus.COMPLETED;
        stop.completedAt = now;
        stop.actualArrival = stop.actualArrival || now;
        route.completedStops += 1;
        pickupCompleted = true;
      }

      if (
        stop.type === StopType.DELIVERY &&
        stop.status !== StopStatus.COMPLETED
      ) {
        stop.status = StopStatus.COMPLETED;
        stop.completedAt = now;
        stop.actualArrival = stop.actualArrival || now;
        route.completedStops += 1;

        // Add courier earning for this delivery
        route.actualEarnings += stop.courierEarning || 0;
        deliveryCompleted = true;
      }
    }

    if (pickupCompleted || deliveryCompleted) {
      // Update currentStopIndex to skip completed stops
      while (
        route.currentStopIndex < route.stops.length &&
        route.stops[route.currentStopIndex].status === StopStatus.COMPLETED
      ) {
        route.currentStopIndex += 1;
      }

      // Check if route is complete
      const allStopsProcessed = route.stops.every(
        (s) =>
          s.status === StopStatus.COMPLETED || s.status === StopStatus.SKIPPED,
      );

      if (allStopsProcessed) {
        route.status = RouteStatus.COMPLETED;
        route.completedAt = now;
        route.actualEndTime = now;
      } else {
        // Recalculate remaining arrival times
        await this.recalculateRemainingArrivalTimes(route);
      }

      await route.save();
      this.logger.log(
        `Marked order ${orderId} as delivered in route ${route._id}. Pickup: ${pickupCompleted}, Delivery: ${deliveryCompleted}`,
      );
    }
  }

  /**
   * Recalculate estimated arrival times for remaining stops
   * Called after an order is delivered early or removed from route
   */
  private async recalculateRemainingArrivalTimes(
    route: CourierRouteDocument,
  ): Promise<void> {
    const now = new Date();
    let currentTime = now;

    // Find the last completed stop to get current location
    let lastCompletedIndex = -1;
    for (let i = route.stops.length - 1; i >= 0; i--) {
      if (route.stops[i].status === StopStatus.COMPLETED) {
        lastCompletedIndex = i;
        break;
      }
    }

    // Get current location from last completed stop or starting point
    let currentLocation: { lat: number; lng: number };
    if (lastCompletedIndex >= 0) {
      const lastStop = route.stops[lastCompletedIndex];
      currentLocation = {
        lat: lastStop.location.coordinates.lat,
        lng: lastStop.location.coordinates.lng,
      };
    } else {
      currentLocation = {
        lat: route.startingPoint.coordinates.lat,
        lng: route.startingPoint.coordinates.lng,
      };
    }

    // Recalculate arrival times for remaining pending stops
    for (let i = route.currentStopIndex; i < route.stops.length; i++) {
      const stop = route.stops[i];
      if (stop.status !== StopStatus.PENDING) continue;

      const travelTime = await this.getRoutingTime(currentLocation, {
        lat: stop.location.coordinates.lat,
        lng: stop.location.coordinates.lng,
      });

      currentTime = new Date(
        currentTime.getTime() + travelTime.duration * 1000,
      );
      stop.estimatedArrival = currentTime;

      // Add handling time for next stop calculation
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
      };
    }

    // Update estimated end time
    route.estimatedEndTime = currentTime;
    route.estimatedTotalTime = Math.round(
      (currentTime.getTime() - now.getTime()) / 60000,
    );
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
    const maxAllowedTime =
      effectiveTargetDuration / (1 + TIME_CONSTANTS.BUFFER_FACTOR);

    // === HELPER FUNCTIONS ===

    const calculateCourierEarning = (order: OrderDocument): number => {
      return (
        Math.round(order.shippingPrice * courierEarningsPercentage * 100) / 100
      );
    };

    // === STEP 1: GROUP ORDERS BY STORE AND RANK STORES ===
    // Find unique stores and calculate their efficiency (earnings per minute)

    interface StoreCluster {
      location: Location;
      orders: OrderWithDistance[];
      totalEarnings: number;
      travelTimeFromStart: number;
      avgDeliveryTime: number;
      efficiencyScore: number; // earnings per minute
    }

    const storeMap = new Map<string, StoreCluster>();

    for (const orderWithDist of ordersWithDistance) {
      // Create store key based on location (rounded to ~100m precision)
      const storeKey = `${orderWithDist.pickupLocation.lat.toFixed(3)}_${orderWithDist.pickupLocation.lng.toFixed(3)}`;

      if (!storeMap.has(storeKey)) {
        const travelTime = this.estimateTravelTime(
          startingPoint,
          orderWithDist.pickupLocation,
        );
        storeMap.set(storeKey, {
          location: orderWithDist.pickupLocation,
          orders: [],
          totalEarnings: 0,
          travelTimeFromStart: travelTime,
          avgDeliveryTime: 0,
          efficiencyScore: 0,
        });
      }

      const store = storeMap.get(storeKey)!;
      const earning = calculateCourierEarning(orderWithDist.order);
      const deliveryTime =
        this.estimateTravelTime(
          orderWithDist.pickupLocation,
          orderWithDist.deliveryLocation,
        ) +
        TIME_CONSTANTS.HANDLING_TIME * 2 +
        TIME_CONSTANTS.REST_TIME_PER_STOP * 2;

      store.orders.push(orderWithDist);
      store.totalEarnings += earning;
      store.avgDeliveryTime += deliveryTime;
    }

    // Calculate efficiency score for each store
    // Efficiency = Total Earnings / (Time to get there + Time to handle all orders)
    for (const store of storeMap.values()) {
      const totalTimeForStore =
        store.travelTimeFromStart + store.avgDeliveryTime;
      store.efficiencyScore =
        totalTimeForStore > 0 ? store.totalEarnings / totalTimeForStore : 0;

      // Sort orders within store by earnings (highest first)
      store.orders.sort(
        (a, b) =>
          calculateCourierEarning(b.order) - calculateCourierEarning(a.order),
      );
    }

    // Rank stores by efficiency (highest first)
    const rankedStores = Array.from(storeMap.values()).sort(
      (a, b) => b.efficiencyScore - a.efficiencyScore,
    );

    // === STEP 2: BUILD ROUTE BY VISITING STORES IN EFFICIENCY ORDER ===
    // Key insight: Visit the BEST store, pick up ALL orders (up to capacity),
    // deliver them, then move to next best store. Don't interleave stores!

    for (const store of rankedStores) {
      // Check if we have time left
      const estimatedRemainingTime = maxAllowedTime - currentTime;
      if (estimatedRemainingTime <= 10) break; // Need at least 10 min

      // Get orders still available at this store
      const availableOrders = store.orders.filter(
        (o) => !usedOrderIds.has(o.order._id.toString()),
      );
      if (availableOrders.length === 0) continue;

      // Calculate time to travel to this store
      const travelTimeToStore = this.estimateTravelTime(
        currentLocation,
        store.location,
      );

      // How many orders can we pick up? (Limited by capacity)
      const availableCapacity = maxItems - currentLoad;
      if (availableCapacity <= 0) {
        // Must deliver first - find nearest delivery
        let nearestOrder: OrderWithDistance | null = null;
        let nearestTime = Infinity;
        for (const o of ordersInProgress) {
          const time = this.estimateTravelTime(
            currentLocation,
            o.deliveryLocation,
          );
          if (time < nearestTime) {
            nearestTime = time;
            nearestOrder = o;
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
          currentLoad -= 1;

          const idx = ordersInProgress.findIndex(
            (o) =>
              o.order._id.toString() === nearestOrder!.order._id.toString(),
          );
          if (idx >= 0) ordersInProgress.splice(idx, 1);

          currentLocation = {
            ...nearestOrder.deliveryLocation,
            address: nearestOrder.order.shippingDetails.address,
            city: nearestOrder.order.shippingDetails.city,
          };
        }
        continue; // Re-check this store after delivery
      }

      // Pick up orders at this store (up to capacity)
      const ordersToPickup = availableOrders.slice(0, availableCapacity);

      // Estimate time for this pickup batch + deliveries
      let batchTime = travelTimeToStore;
      for (let i = 0; i < ordersToPickup.length; i++) {
        batchTime +=
          TIME_CONSTANTS.HANDLING_TIME + TIME_CONSTANTS.REST_TIME_PER_STOP;
      }
      // Add estimated delivery time for these orders
      let lastLoc = store.location;
      for (const o of ordersToPickup) {
        batchTime +=
          this.estimateTravelTime(lastLoc, o.deliveryLocation) +
          TIME_CONSTANTS.HANDLING_TIME +
          TIME_CONSTANTS.REST_TIME_PER_STOP;
        lastLoc = o.deliveryLocation;
      }

      // Check if we have time for this batch
      if (currentTime + batchTime > maxAllowedTime) {
        // Try with fewer orders
        const reducedCount = Math.max(
          1,
          Math.floor(ordersToPickup.length * 0.5),
        );
        ordersToPickup.splice(reducedCount);
        if (ordersToPickup.length === 0) continue;
      }

      // === PICKUP ALL ORDERS AT THIS STORE ===
      for (let i = 0; i < ordersToPickup.length; i++) {
        const orderToPickup = ordersToPickup[i];
        const pickupStop = this.createPickupStop(orderToPickup);
        pickupStop.courierEarning = calculateCourierEarning(
          orderToPickup.order,
        );

        stops.push(pickupStop);

        // Only add travel time for first pickup
        const stopTime =
          (i === 0 ? travelTimeToStore : 0) +
          TIME_CONSTANTS.HANDLING_TIME +
          TIME_CONSTANTS.REST_TIME_PER_STOP;

        currentTime += stopTime;
        usedOrderIds.add(orderToPickup.order._id.toString());
        ordersInProgress.push(orderToPickup);
        currentLoad += 1;
      }

      // Update location to store
      currentLocation = {
        ...store.location,
        address: ordersToPickup[0].order.pickupAddress || '',
        city: ordersToPickup[0].order.pickupCity || '',
      };

      // === DELIVER ALL PICKED ORDERS (NEAREST FIRST) ===
      // This ensures we complete one store before moving to the next
      while (ordersInProgress.length > 0 && currentLoad > 0) {
        // Find nearest delivery
        let nearestOrder: OrderWithDistance | null = null;
        let nearestTime = Infinity;

        for (const o of ordersInProgress) {
          const time = this.estimateTravelTime(
            currentLocation,
            o.deliveryLocation,
          );
          if (time < nearestTime) {
            nearestTime = time;
            nearestOrder = o;
          }
        }

        if (!nearestOrder) break;

        const deliveryStop = this.createDeliveryStop(nearestOrder);
        deliveryStop.courierEarning = calculateCourierEarning(
          nearestOrder.order,
        );
        stops.push(deliveryStop);

        currentTime +=
          nearestTime +
          TIME_CONSTANTS.HANDLING_TIME +
          TIME_CONSTANTS.REST_TIME_PER_STOP;

        const idx = ordersInProgress.findIndex(
          (o) => o.order._id.toString() === nearestOrder!.order._id.toString(),
        );
        if (idx >= 0) ordersInProgress.splice(idx, 1);
        currentLoad -= 1;

        currentLocation = {
          ...nearestOrder.deliveryLocation,
          address: nearestOrder.order.shippingDetails.address,
          city: nearestOrder.order.shippingDetails.city,
        };

        // Check time
        if (currentTime >= maxAllowedTime * 0.95) break;
      }

      // Check if we should stop
      if (currentTime >= maxAllowedTime * 0.9) break;
    }

    // Deliver any remaining orders
    while (ordersInProgress.length > 0) {
      let nearestOrder: OrderWithDistance | null = null;
      let nearestTime = Infinity;

      for (const o of ordersInProgress) {
        const time = this.estimateTravelTime(
          currentLocation,
          o.deliveryLocation,
        );
        if (time < nearestTime) {
          nearestTime = time;
          nearestOrder = o;
        }
      }

      if (!nearestOrder) break;

      const deliveryStop = this.createDeliveryStop(nearestOrder);
      deliveryStop.courierEarning = calculateCourierEarning(nearestOrder.order);
      stops.push(deliveryStop);

      currentTime +=
        nearestTime +
        TIME_CONSTANTS.HANDLING_TIME +
        TIME_CONSTANTS.REST_TIME_PER_STOP;

      const idx = ordersInProgress.findIndex(
        (o) => o.order._id.toString() === nearestOrder!.order._id.toString(),
      );
      if (idx >= 0) ordersInProgress.splice(idx, 1);

      currentLocation = {
        ...nearestOrder.deliveryLocation,
        address: nearestOrder.order.shippingDetails.address,
        city: nearestOrder.order.shippingDetails.city,
      };
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
   * Build a route for a specific target duration using the OPTIMAL algorithm
   * Returns the same RoutePreviewDto format as buildRouteForDuration for consistency
   */
  private async buildOptimalRouteForDuration(
    availableOrders: OrderDocument[],
    ordersWithDistance: OrderWithDistance[],
    startingPoint: { lat: number; lng: number; address: string; city: string },
    targetDuration: number,
    maxItems: number,
    includeBreaks: boolean,
  ): Promise<RoutePreviewDto | null> {
    const settings = await this.siteSettingsService.getSettings();
    const courierEarningsPercentage = settings.courierEarningsPercentage ?? 0.8;

    // Prepare order data for optimal algorithm
    const orderData = availableOrders.map((order) => ({
      orderId: order._id.toString(),
      pickupLocation: {
        lat: order.pickupLocation?.lat ?? 41.7151,
        lng: order.pickupLocation?.lng ?? 44.8271,
      },
      deliveryLocation: {
        lat: order.deliveryLocation?.lat ?? 41.7151,
        lng: order.deliveryLocation?.lng ?? 44.8271,
      },
      earning:
        Math.round(order.shippingPrice * courierEarningsPercentage * 100) / 100,
      handlingTime:
        TIME_CONSTANTS.HANDLING_TIME + TIME_CONSTANTS.REST_TIME_PER_STOP,
    }));

    // Run optimal algorithm with break time if enabled
    const breakTimeMinutes = includeBreaks ? TIME_CONSTANTS.BREAK_DURATION : 0;
    const result = findBestOrderSubset(
      { lat: startingPoint.lat, lng: startingPoint.lng },
      orderData,
      maxItems,
      targetDuration,
      breakTimeMinutes,
    );

    if (result.stops.length === 0) return null;

    // Create order lookup map for enrichment
    const orderMap = new Map<string, OrderWithDistance>();
    for (const owd of ordersWithDistance) {
      orderMap.set(owd.order._id.toString(), owd);
    }

    // Convert OptimalStop[] to RouteStopPreviewDto[]
    const now = new Date();
    let estimatedTime = now;
    let prevLocation = { lat: startingPoint.lat, lng: startingPoint.lng };

    const previewStops: RouteStopPreviewDto[] = result.stops.map((stop) => {
      const orderWithDist = orderMap.get(stop.orderId);
      const order = orderWithDist?.order;

      // Calculate travel time from previous location
      const travelMinutes = this.estimateTravelTime(
        prevLocation,
        stop.location,
      );
      estimatedTime = new Date(
        estimatedTime.getTime() + travelMinutes * 60 * 1000,
      );
      const arrivalTime = new Date(estimatedTime);

      // Add handling time for next calculation
      estimatedTime = new Date(
        estimatedTime.getTime() +
          (TIME_CONSTANTS.HANDLING_TIME + TIME_CONSTANTS.REST_TIME_PER_STOP) *
            60 *
            1000,
      );
      prevLocation = stop.location;

      if (stop.type === 'pickup') {
        return {
          stopId: stop.id,
          orderId: stop.orderId,
          type: 'pickup' as const,
          address:
            order?.pickupAddress || order?.orderItems[0]?.storeName || '',
          city: order?.pickupCity || '',
          coordinates: stop.location,
          estimatedArrival: arrivalTime.toISOString(),
          storeName: order?.pickupStoreName,
          contactName: order?.pickupStoreName,
          contactPhone: order?.pickupPhoneNumber,
          orderValue: order?.totalPrice,
          shippingSize: this.mapShippingSize(
            order?.shippingSize || order?.estimatedShippingSize,
          ),
          deliveryDeadline: order?.deliveryDeadline?.toISOString(),
          orderItems: order?.orderItems.map((item) => ({
            name: item.name,
            nameEn: item.nameEn,
            image: item.image,
            qty: item.qty,
            price: item.price,
          })),
        };
      } else {
        return {
          stopId: stop.id,
          orderId: stop.orderId,
          type: 'delivery' as const,
          address: order?.shippingDetails?.address || '',
          city: order?.shippingDetails?.city || '',
          coordinates: stop.location,
          estimatedArrival: arrivalTime.toISOString(),
          contactName: order?.recipientName,
          contactPhone: order?.shippingDetails?.phoneNumber,
          orderValue: order?.totalPrice,
          courierEarning: stop.earning,
          shippingSize: this.mapShippingSize(
            order?.shippingSize || order?.estimatedShippingSize,
          ),
          deliveryDeadline: order?.deliveryDeadline?.toISOString(),
        };
      }
    });

    // Insert break stop if needed (same as heuristic algorithm)
    if (includeBreaks && previewStops.length >= 4) {
      const midPoint = Math.floor(previewStops.length / 2);
      const breakLocation = previewStops[midPoint - 1].coordinates;

      // Calculate break arrival time (after previous stop's handling time)
      const prevStopArrival = new Date(
        previewStops[midPoint - 1].estimatedArrival,
      );
      const breakArrivalTime = new Date(
        prevStopArrival.getTime() +
          (TIME_CONSTANTS.HANDLING_TIME + TIME_CONSTANTS.REST_TIME_PER_STOP) *
            60 *
            1000,
      );

      const breakStop: RouteStopPreviewDto = {
        stopId: uuidv4(),
        orderId: '',
        type: 'break' as const,
        address: 'Break',
        city: previewStops[midPoint - 1].city || '',
        coordinates: breakLocation,
        estimatedArrival: breakArrivalTime.toISOString(),
        breakDurationMinutes: TIME_CONSTANTS.BREAK_DURATION,
      };
      previewStops.splice(midPoint, 0, breakStop);

      // Update all stops AFTER the break to add 30 minutes
      for (let i = midPoint + 1; i < previewStops.length; i++) {
        const oldArrival = new Date(previewStops[i].estimatedArrival);
        const newArrival = new Date(
          oldArrival.getTime() + TIME_CONSTANTS.BREAK_DURATION * 60 * 1000,
        );
        previewStops[i].estimatedArrival = newArrival.toISOString();
      }
    }

    // Count unique orders (deliveries = order count)
    const orderCount = result.stops.filter((s) => s.type === 'delivery').length;

    // Add break time to total if break was included
    const totalTimeWithBreak = includeBreaks
      ? result.totalTime + TIME_CONSTANTS.BREAK_DURATION
      : result.totalTime;

    return {
      duration: targetDuration,
      durationLabel: this.formatDuration(targetDuration),
      stops: previewStops,
      orderCount,
      estimatedEarnings: result.totalEarnings,
      estimatedTime: Math.round(totalTimeWithBreak),
      estimatedDistanceKm: Math.round(result.totalDistance * 10) / 10,
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

  // =================== COURIER ANALYTICS ===================

  /**
   * Get courier analytics data
   * Returns delivery statistics, earnings, and performance metrics
   */
  async getCourierAnalytics(
    courierId: string,
    period: 'week' | 'month' | 'year' | 'all' = 'week',
  ): Promise<{
    totalDeliveries: number;
    totalEarnings: number;
    totalRoutes: number;
    thisWeek: { deliveries: number; earnings: number; routes: number };
    thisMonth: { deliveries: number; earnings: number; routes: number };
    averageDeliveriesPerRoute: number;
    averageEarningsPerDelivery: number;
    averageHandlingTimeMinutes: number;
    averageRouteTimeMinutes: number;
    onTimeDeliveryRate: number;
    dailyStats: Array<{
      date: string;
      deliveries: number;
      earnings: number;
      routes: number;
    }>;
    recentRoutes: Array<{
      _id: string;
      completedAt: Date;
      deliveries: number;
      earnings: number;
      duration: number;
    }>;
  }> {
    const courierObjectId = new Types.ObjectId(courierId);
    const now = new Date();

    // Calculate date ranges
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Determine the period start date for daily stats
    let periodStart: Date;
    switch (period) {
      case 'week':
        periodStart = startOfWeek;
        break;
      case 'month':
        periodStart = startOfMonth;
        break;
      case 'year':
        periodStart = startOfYear;
        break;
      case 'all':
      default:
        periodStart = new Date(0); // Beginning of time
    }

    // Get all completed routes for this courier
    const allRoutes = await this.courierRouteModel
      .find({
        courierId: courierObjectId,
        status: RouteStatus.COMPLETED,
      })
      .sort({ completedAt: -1 });

    // Calculate totals
    let totalDeliveries = 0;
    let totalEarnings = 0;
    let totalHandlingTime = 0;
    let handlingTimeCount = 0;
    let totalRouteTime = 0;
    let onTimeDeliveries = 0;
    let totalDeliveriesWithDeadline = 0;

    for (const route of allRoutes) {
      totalEarnings += route.actualEarnings || 0;

      // Calculate route duration
      if (route.actualStartTime && route.actualEndTime) {
        const duration =
          route.actualEndTime.getTime() - route.actualStartTime.getTime();
        totalRouteTime += duration / 60000; // Convert to minutes
      }

      for (const stop of route.stops) {
        if (
          stop.type === StopType.DELIVERY &&
          stop.status === StopStatus.COMPLETED
        ) {
          totalDeliveries++;

          // Track handling time
          if (stop.handlingTimeMinutes) {
            totalHandlingTime += stop.handlingTimeMinutes;
            handlingTimeCount++;
          }

          // Check on-time delivery
          if (stop.deliveryDeadline && stop.completedAt) {
            totalDeliveriesWithDeadline++;
            if (stop.completedAt <= stop.deliveryDeadline) {
              onTimeDeliveries++;
            }
          }
        }
      }
    }

    // Weekly stats
    const weekRoutes = allRoutes.filter(
      (r) => r.completedAt && r.completedAt >= startOfWeek,
    );
    const thisWeek = {
      deliveries: 0,
      earnings: 0,
      routes: weekRoutes.length,
    };
    for (const route of weekRoutes) {
      thisWeek.earnings += route.actualEarnings || 0;
      thisWeek.deliveries += route.stops.filter(
        (s) =>
          s.type === StopType.DELIVERY && s.status === StopStatus.COMPLETED,
      ).length;
    }

    // Monthly stats
    const monthRoutes = allRoutes.filter(
      (r) => r.completedAt && r.completedAt >= startOfMonth,
    );
    const thisMonth = {
      deliveries: 0,
      earnings: 0,
      routes: monthRoutes.length,
    };
    for (const route of monthRoutes) {
      thisMonth.earnings += route.actualEarnings || 0;
      thisMonth.deliveries += route.stops.filter(
        (s) =>
          s.type === StopType.DELIVERY && s.status === StopStatus.COMPLETED,
      ).length;
    }

    // Daily stats for the selected period
    const periodRoutes = allRoutes.filter(
      (r) => r.completedAt && r.completedAt >= periodStart,
    );

    const dailyStatsMap = new Map<
      string,
      { deliveries: number; earnings: number; routes: number }
    >();

    for (const route of periodRoutes) {
      if (!route.completedAt) continue;

      const dateKey = route.completedAt.toISOString().split('T')[0];
      const existing = dailyStatsMap.get(dateKey) || {
        deliveries: 0,
        earnings: 0,
        routes: 0,
      };

      existing.routes++;
      existing.earnings += route.actualEarnings || 0;
      existing.deliveries += route.stops.filter(
        (s) =>
          s.type === StopType.DELIVERY && s.status === StopStatus.COMPLETED,
      ).length;

      dailyStatsMap.set(dateKey, existing);
    }

    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent routes (last 10)
    const recentRoutes = allRoutes.slice(0, 10).map((route) => ({
      _id: route._id.toString(),
      completedAt: route.completedAt!,
      deliveries: route.stops.filter(
        (s) =>
          s.type === StopType.DELIVERY && s.status === StopStatus.COMPLETED,
      ).length,
      earnings: route.actualEarnings || 0,
      duration:
        route.actualStartTime && route.actualEndTime
          ? Math.round(
              (route.actualEndTime.getTime() -
                route.actualStartTime.getTime()) /
                60000,
            )
          : route.estimatedTotalTime || 0,
    }));

    return {
      totalDeliveries,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalRoutes: allRoutes.length,
      thisWeek: {
        ...thisWeek,
        earnings: Math.round(thisWeek.earnings * 100) / 100,
      },
      thisMonth: {
        ...thisMonth,
        earnings: Math.round(thisMonth.earnings * 100) / 100,
      },
      averageDeliveriesPerRoute:
        allRoutes.length > 0
          ? Math.round((totalDeliveries / allRoutes.length) * 10) / 10
          : 0,
      averageEarningsPerDelivery:
        totalDeliveries > 0
          ? Math.round((totalEarnings / totalDeliveries) * 100) / 100
          : 0,
      averageHandlingTimeMinutes:
        handlingTimeCount > 0
          ? Math.round((totalHandlingTime / handlingTimeCount) * 10) / 10
          : 0,
      averageRouteTimeMinutes:
        allRoutes.length > 0
          ? Math.round((totalRouteTime / allRoutes.length) * 10) / 10
          : 0,
      onTimeDeliveryRate:
        totalDeliveriesWithDeadline > 0
          ? Math.round(
              (onTimeDeliveries / totalDeliveriesWithDeadline) * 1000,
            ) / 10
          : 100,
      dailyStats,
      recentRoutes,
    };
  }

  /**
   * Get detailed route with time tracking information
   */
  async getRouteDetails(
    courierId: string,
    routeId: string,
  ): Promise<CourierRouteDocument | null> {
    return this.courierRouteModel.findOne({
      _id: new Types.ObjectId(routeId),
      courierId: new Types.ObjectId(courierId),
    });
  }
}
