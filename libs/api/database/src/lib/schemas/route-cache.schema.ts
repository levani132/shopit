import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RouteCacheDocument = HydratedDocument<RouteCache>;

/**
 * Cached route data structure
 */
@Schema({ _id: false })
export class CachedRouteStop {
  @Prop({ required: true })
  stopId!: string;

  @Prop({ type: String })
  orderId?: string;

  @Prop({ required: true, enum: ['pickup', 'delivery', 'break'] })
  type!: 'pickup' | 'delivery' | 'break';

  @Prop({ type: Object, required: true })
  coordinates!: { lat: number; lng: number };

  @Prop({ required: true })
  address!: string;

  @Prop({ required: true })
  city!: string;

  @Prop()
  contactName?: string;

  @Prop()
  contactPhone?: string;

  @Prop()
  storeName?: string;

  @Prop()
  orderValue?: number;

  @Prop()
  courierEarning?: number;

  @Prop()
  breakDurationMinutes?: number;

  @Prop()
  shippingSize?: string;

  @Prop()
  deliveryDeadline?: string;

  @Prop({ type: [Object] })
  orderItems?: {
    name: string;
    nameEn?: string;
    image: string;
    qty: number;
    price: number;
  }[];

  @Prop()
  estimatedArrival?: string;

  @Prop()
  travelTimeFromPrevious?: number;

  @Prop()
  distanceFromPrevious?: number;
}

export const CachedRouteStopSchema =
  SchemaFactory.createForClass(CachedRouteStop);

@Schema({ _id: false })
export class CachedRoute {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  duration!: number; // Target duration in minutes

  @Prop({ required: true })
  durationLabel!: string; // e.g., "1h", "2h"

  @Prop({ required: true })
  durationMinutes!: number;

  @Prop({ required: true })
  totalDistanceKm!: number;

  @Prop({ required: true })
  estimatedTime!: number; // Actual estimated time in minutes

  @Prop({ required: true })
  estimatedDistanceKm!: number;

  @Prop({ required: true })
  orderCount!: number;

  @Prop({ required: true })
  stopCount!: number;

  @Prop({ required: true })
  totalEarnings!: number;

  @Prop({ required: true })
  estimatedEarnings!: number;

  @Prop({ required: true })
  estimatedStartTime!: Date;

  @Prop({ required: true })
  estimatedEndTime!: Date;

  @Prop({ type: [CachedRouteStopSchema], required: true })
  stops!: CachedRouteStop[];

  @Prop({ type: Object, required: true })
  startingPoint!: { lat: number; lng: number; address: string };
}

export const CachedRouteSchema = SchemaFactory.createForClass(CachedRoute);

@Schema({ _id: false })
export class CachedRouteData {
  @Prop({ type: [CachedRouteSchema], required: true })
  routes!: CachedRoute[];

  @Prop({ required: true })
  generatedAt!: Date;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ required: true })
  availableOrderCount!: number;

  @Prop({ required: true })
  vehicleType!: string;

  @Prop({ type: Object, required: true })
  startingLocation!: { lat: number; lng: number };
}

export const CachedRouteDataSchema =
  SchemaFactory.createForClass(CachedRouteData);

/**
 * Route Cache Schema
 * Stores generated routes per courier with invalidation tracking
 */
@Schema({ timestamps: true, collection: 'route_cache' })
export class RouteCache {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  courierId!: Types.ObjectId;

  /**
   * Whether the cache needs to be regenerated
   * Set to true when orders change or courier takes/abandons orders
   */
  @Prop({ default: true })
  needsRevalidation!: boolean;

  /**
   * Whether route generation is currently in progress
   * Used for race condition handling
   */
  @Prop({ default: false })
  isGenerating!: boolean;

  /**
   * When the current generation started
   * Used to detect stale locks (if generation takes too long)
   */
  @Prop()
  generationStartedAt?: Date;

  /**
   * The cached route data
   */
  @Prop({ type: CachedRouteDataSchema })
  cachedData?: CachedRouteData;

  /**
   * When routes were last successfully generated
   */
  @Prop()
  lastGeneratedAt?: Date;

  /**
   * Version number for optimistic locking
   * Incremented on each update to prevent stale writes
   */
  @Prop({ default: 0 })
  version!: number;
}

export const RouteCacheSchema = SchemaFactory.createForClass(RouteCache);

// Create indexes
RouteCacheSchema.index({ courierId: 1 }, { unique: true });
RouteCacheSchema.index({ needsRevalidation: 1, isGenerating: 1 });
