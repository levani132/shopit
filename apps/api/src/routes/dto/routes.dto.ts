import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Location coordinates with address
 */
export class LocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsString()
  address!: string;

  @IsString()
  city!: string;
}

/**
 * DTO for generating routes
 */
export class GenerateRoutesDto {
  @ValidateNested()
  @Type(() => LocationDto)
  startingPoint!: LocationDto;

  @IsBoolean()
  @IsOptional()
  includeBreaks?: boolean;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsEnum(['heuristic', 'optimal'])
  @IsOptional()
  algorithm?: 'heuristic' | 'optimal';
}

/**
 * Route preview response (for selection)
 */
export class RoutePreviewDto {
  duration!: number; // Target duration in minutes
  durationLabel!: string; // e.g., "1h", "2h"
  stops!: RouteStopPreviewDto[];
  orderCount!: number;
  estimatedEarnings!: number;
  estimatedTime!: number; // Actual estimated time in minutes
  estimatedDistanceKm!: number;
}

/**
 * Order item for stop details
 */
export class OrderItemPreviewDto {
  name!: string;
  nameEn?: string;
  qty!: number;
  price!: number;
  image?: string;
}

/**
 * Stop preview for route selection
 */
export class RouteStopPreviewDto {
  stopId!: string;
  orderId?: string;
  type!: 'pickup' | 'delivery' | 'break';
  address!: string;
  city!: string;
  coordinates!: { lat: number; lng: number };
  estimatedArrival!: string; // ISO date string
  storeName?: string;
  contactName?: string;
  contactPhone?: string;
  orderValue?: number;
  courierEarning?: number; // Courier's earning from this delivery (with commission applied)
  breakDurationMinutes?: number;
  shippingSize?: 'regular' | 'large' | 'xl';
  deliveryDeadline?: string; // ISO date string
  orderItems?: OrderItemPreviewDto[];
}

/**
 * DTO for claiming a route
 */
export class ClaimRouteDto {
  @IsNumber()
  @Min(60)
  @Max(480)
  duration!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClaimStopDto)
  stops!: ClaimStopDto[];

  @IsArray()
  @IsString({ each: true })
  orderIds!: string[];

  @ValidateNested()
  @Type(() => LocationDto)
  startingPoint!: LocationDto;

  @IsBoolean()
  @IsOptional()
  includeBreaks?: boolean;
}

export class BreakLocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;
}

export class ClaimStopDto {
  @IsString()
  stopId!: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsEnum(['pickup', 'delivery', 'break'])
  type!: 'pickup' | 'delivery' | 'break';

  // Location for break stops (since they don't have an orderId)
  @ValidateNested()
  @Type(() => BreakLocationDto)
  @IsOptional()
  location?: BreakLocationDto;
}

/**
 * DTO for updating route progress
 */
export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  stopIndex!: number;

  @IsEnum(['arrived', 'completed', 'skipped'])
  action!: 'arrived' | 'completed' | 'skipped';
}

/**
 * DTO for abandoning route
 */
export class AbandonRouteDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Generated routes response
 */
export class GeneratedRoutesResponseDto {
  routes!: RoutePreviewDto[];
  generatedAt!: string;
  expiresAt!: string;
  availableOrderCount!: number;
}
