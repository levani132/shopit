import {
  IsNumber,
  IsBoolean,
  IsString,
  IsOptional,
  Min,
  Max,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Vehicle shipping config DTO
 */
export class VehicleShippingConfigDto {
  @ApiProperty({ description: 'Rate per minute in GEL' })
  @IsNumber()
  @Min(0)
  ratePerMinute: number;

  @ApiProperty({ description: 'Minimum fee in GEL' })
  @IsNumber()
  @Min(0)
  minimumFee: number;

  @ApiProperty({ description: 'Maximum weight in kg' })
  @IsNumber()
  @Min(0)
  maxWeight: number;

  @ApiProperty({ description: 'Maximum dimension in cm' })
  @IsNumber()
  @Min(0)
  maxDimension: number;
}

/**
 * Update site settings DTO
 */
export class UpdateSiteSettingsDto {
  // Commission Settings
  @ApiPropertyOptional({ description: 'Site commission rate (0.0 - 1.0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  siteCommissionRate?: number;

  // Shipping Rates
  @ApiPropertyOptional({ description: 'Bike shipping config' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleShippingConfigDto)
  bikeShipping?: VehicleShippingConfigDto;

  @ApiPropertyOptional({ description: 'Car shipping config' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleShippingConfigDto)
  carShipping?: VehicleShippingConfigDto;

  @ApiPropertyOptional({ description: 'SUV shipping config' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleShippingConfigDto)
  suvShipping?: VehicleShippingConfigDto;

  @ApiPropertyOptional({ description: 'Van shipping config' })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleShippingConfigDto)
  vanShipping?: VehicleShippingConfigDto;

  // Delivery Fee Settings
  @ApiPropertyOptional({ description: 'Default delivery rate per minute' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDeliveryRatePerMinute?: number;

  @ApiPropertyOptional({ description: 'Minimum delivery fee in GEL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumDeliveryFee?: number;

  @ApiPropertyOptional({ description: 'Delivery fee precision (rounding)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  deliveryFeePrecision?: number;

  // Subdomain Settings
  @ApiPropertyOptional({ description: 'Number of free subdomain changes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeSubdomainChanges?: number;

  @ApiPropertyOptional({ description: 'Subdomain change price in GEL (after free changes)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subdomainChangePrice?: number;

  // Courier Settings
  @ApiPropertyOptional({ description: 'Courier earnings as percentage of delivery fee (0.0 - 1.0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  courierEarningsPercentage?: number;

  // Withdrawal Settings
  @ApiPropertyOptional({ description: 'Minimum withdrawal amount in GEL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumWithdrawalAmount?: number;

  @ApiPropertyOptional({ description: 'Withdrawal processing fee in GEL' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  withdrawalFee?: number;

  // Platform Info
  @ApiPropertyOptional({ description: 'Platform name' })
  @IsOptional()
  @IsString()
  platformName?: string;

  @ApiPropertyOptional({ description: 'Support email' })
  @IsOptional()
  @IsString()
  supportEmail?: string;

  @ApiPropertyOptional({ description: 'Support phone' })
  @IsOptional()
  @IsString()
  supportPhone?: string;

  // Feature Flags
  @ApiPropertyOptional({ description: 'Allow new store registrations' })
  @IsOptional()
  @IsBoolean()
  allowStoreRegistrations?: boolean;

  @ApiPropertyOptional({ description: 'Allow new courier registrations' })
  @IsOptional()
  @IsBoolean()
  allowCourierRegistrations?: boolean;

  @ApiPropertyOptional({ description: 'Enable maintenance mode' })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({ description: 'Maintenance message' })
  @IsOptional()
  @IsString()
  maintenanceMessage?: string;
}

/**
 * Approve/Reject courier application DTO
 */
export class CourierApplicationActionDto {
  @ApiProperty({ description: 'Action to take', enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Query params for listing users
 */
export class ListUsersQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Query params for listing stores
 */
export class ListStoresQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by publish status' })
  @IsOptional()
  @IsString()
  publishStatus?: string;

  @ApiPropertyOptional({ description: 'Search by name or subdomain' })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * Query params for listing orders
 */
export class ListOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by store ID' })
  @IsOptional()
  @IsString()
  storeId?: string;
}

