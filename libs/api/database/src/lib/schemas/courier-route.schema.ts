import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CourierRouteDocument = HydratedDocument<CourierRoute>;

/**
 * Route status enum
 */
export enum RouteStatus {
  DRAFT = 'draft', // Generated but not yet claimed
  ACTIVE = 'active', // Courier is working on this route
  COMPLETED = 'completed', // All stops completed
  ABANDONED = 'abandoned', // Courier abandoned the route
}

/**
 * Stop status enum
 */
export enum StopStatus {
  PENDING = 'pending', // Not yet visited
  ARRIVED = 'arrived', // Courier has arrived at the location
  COMPLETED = 'completed', // Stop action completed (picked up/delivered)
  SKIPPED = 'skipped', // Courier skipped this stop
}

/**
 * Stop type enum
 */
export enum StopType {
  PICKUP = 'pickup', // Pick up from store
  DELIVERY = 'delivery', // Deliver to customer
  BREAK = 'break', // Scheduled break
}

/**
 * Location with coordinates
 */
@Schema({ _id: false })
export class RouteLocation {
  @Prop({ required: true })
  address!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ type: Object, required: true })
  coordinates!: {
    lat: number;
    lng: number;
  };
}

export const RouteLocationSchema = SchemaFactory.createForClass(RouteLocation);

/**
 * Individual stop in the route
 */
@Schema({ _id: false })
export class RouteStop {
  @Prop({ required: true })
  _id!: string; // UUID for each stop

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId; // null for break stops

  @Prop({ type: String, enum: StopType, required: true })
  type!: StopType;

  @Prop({ type: RouteLocationSchema, required: true })
  location!: RouteLocation;

  @Prop()
  estimatedArrival?: Date;

  @Prop()
  actualArrival?: Date;

  @Prop({ type: String, enum: StopStatus, default: StopStatus.PENDING })
  status!: StopStatus;

  // Contact information
  @Prop()
  contactName?: string;

  @Prop()
  contactPhone?: string;

  // Store name for pickup stops
  @Prop()
  storeName?: string;

  // Order details (denormalized for display)
  @Prop()
  orderValue?: number;

  // Courier's earning for this delivery (shipping price * earnings percentage)
  @Prop()
  courierEarning?: number;

  @Prop({ type: [Object], default: [] })
  orderItems?: {
    name: string;
    nameEn?: string;
    image: string;
    qty: number;
    price: number;
  }[];

  // Time tracking
  @Prop()
  completedAt?: Date;

  // Break duration (only for break stops)
  @Prop()
  breakDurationMinutes?: number;
}

export const RouteStopSchema = SchemaFactory.createForClass(RouteStop);

/**
 * Courier Route schema
 * Represents a planned delivery route with multiple stops
 */
@Schema({ timestamps: true, collection: 'courier_routes' })
export class CourierRoute {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  courierId!: Types.ObjectId;

  @Prop({ type: String, enum: RouteStatus, default: RouteStatus.DRAFT })
  status!: RouteStatus;

  // Starting point
  @Prop({ type: RouteLocationSchema, required: true })
  startingPoint!: RouteLocation;

  // Route configuration
  @Prop({ required: true })
  targetDuration!: number; // Target duration in minutes (60, 120, 180, etc.)

  @Prop({ default: false })
  includeBreaks!: boolean;

  // Route stops
  @Prop({ type: [RouteStopSchema], default: [] })
  stops!: RouteStop[];

  // Progress tracking
  @Prop({ default: 0 })
  currentStopIndex!: number;

  @Prop({ default: 0 })
  completedStops!: number;

  // Time estimates
  @Prop({ required: true })
  estimatedTotalTime!: number; // minutes

  @Prop()
  estimatedEndTime?: Date;

  @Prop()
  actualStartTime?: Date;

  @Prop()
  actualEndTime?: Date;

  // Distance
  @Prop({ default: 0 })
  estimatedDistanceKm!: number;

  // Earnings
  @Prop({ required: true, default: 0 })
  estimatedEarnings!: number;

  @Prop({ default: 0 })
  actualEarnings!: number;

  // Orders in this route
  @Prop({ type: [Types.ObjectId], ref: 'Order', default: [] })
  orderIds!: Types.ObjectId[];

  // Lifecycle timestamps
  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  abandonedAt?: Date;

  @Prop()
  abandonReason?: string;
}

export const CourierRouteSchema = SchemaFactory.createForClass(CourierRoute);

// Indexes
CourierRouteSchema.index({ courierId: 1, status: 1 });
CourierRouteSchema.index({ courierId: 1, createdAt: -1 });
CourierRouteSchema.index({ status: 1, createdAt: -1 });
CourierRouteSchema.index({ orderIds: 1 }); // Find routes containing specific orders
