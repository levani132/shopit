import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SiteSettingsDocument = SiteSettings & Document;

/**
 * Vehicle-specific shipping configuration
 */
export interface VehicleShippingConfig {
  ratePerMinute: number; // GEL per minute
  minimumFee: number; // Minimum fee in GEL
  maxWeight: number; // Maximum weight in kg (for vehicle selection)
  maxDimension: number; // Maximum dimension in cm (for vehicle selection)
}

/**
 * Site Settings Schema
 * 
 * Stores all configurable constants for the platform.
 * There should only be ONE document of this type in the database.
 */
@Schema({ timestamps: true })
export class SiteSettings {
  // ===== Commission Settings =====

  /**
   * Site commission rate (0.0 - 1.0)
   * Applied to all sales regardless of delivery method
   * Default: 0.10 (10%)
   */
  @Prop({ default: 0.10 })
  siteCommissionRate: number;

  // ===== Shipping Rate Settings =====

  /**
   * Bike/Motorcycle shipping config
   */
  @Prop({
    type: Object,
    default: {
      ratePerMinute: 0.5,
      minimumFee: 3,
      maxWeight: 5,
      maxDimension: 30,
    },
  })
  bikeShipping: VehicleShippingConfig;

  /**
   * Car shipping config
   */
  @Prop({
    type: Object,
    default: {
      ratePerMinute: 0.75,
      minimumFee: 5,
      maxWeight: 20,
      maxDimension: 60,
    },
  })
  carShipping: VehicleShippingConfig;

  /**
   * SUV/Large car shipping config
   */
  @Prop({
    type: Object,
    default: {
      ratePerMinute: 1.0,
      minimumFee: 8,
      maxWeight: 50,
      maxDimension: 100,
    },
  })
  suvShipping: VehicleShippingConfig;

  /**
   * Van/Truck shipping config
   * (No maxWeight/maxDimension as it's the fallback)
   */
  @Prop({
    type: Object,
    default: {
      ratePerMinute: 2.0,
      minimumFee: 15,
      maxWeight: 999999,
      maxDimension: 999999,
    },
  })
  vanShipping: VehicleShippingConfig;

  // ===== Delivery Fee Settings =====

  /**
   * Default rate per minute for delivery fee calculation
   * Used when product dimensions are unknown
   * Default: 0.5 GEL/min
   */
  @Prop({ default: 0.5 })
  defaultDeliveryRatePerMinute: number;

  /**
   * Minimum delivery fee in GEL
   * Default: 3 GEL
   */
  @Prop({ default: 3 })
  minimumDeliveryFee: number;

  /**
   * Delivery fee precision (rounding)
   * Default: 0.5 (round up to nearest 0.5 GEL)
   */
  @Prop({ default: 0.5 })
  deliveryFeePrecision: number;

  // ===== Subdomain Settings =====

  /**
   * Number of free subdomain changes allowed
   * Default: 1 (first change is free)
   */
  @Prop({ default: 1 })
  freeSubdomainChanges: number;

  /**
   * Price for subdomain change (after free changes are used)
   * Default: 10 GEL
   */
  @Prop({ default: 10 })
  subdomainChangePrice: number;

  // ===== Courier Settings =====

  /**
   * Courier earnings as percentage of delivery fee (0.0 - 1.0)
   * Couriers receive this percentage of the delivery fee paid by customer
   * Default: 0.80 (80%)
   */
  @Prop({ default: 0.80 })
  courierEarningsPercentage: number;

  // ===== Withdrawal Settings =====

  /**
   * Minimum withdrawal amount in GEL
   */
  @Prop({ default: 20 })
  minimumWithdrawalAmount: number;

  /**
   * Withdrawal processing fee (fixed amount in GEL)
   */
  @Prop({ default: 0 })
  withdrawalFee: number;

  // ===== Platform Info =====

  /**
   * Platform name
   */
  @Prop({ default: 'ShopIt' })
  platformName: string;

  /**
   * Support email
   */
  @Prop({ default: 'support@shopit.ge' })
  supportEmail: string;

  /**
   * Support phone
   */
  @Prop({ default: '' })
  supportPhone: string;

  // ===== Feature Flags =====

  /**
   * Whether to allow new store registrations
   */
  @Prop({ default: true })
  allowStoreRegistrations: boolean;

  /**
   * Whether to allow new courier registrations
   */
  @Prop({ default: true })
  allowCourierRegistrations: boolean;

  /**
   * Maintenance mode - disables public access
   */
  @Prop({ default: false })
  maintenanceMode: boolean;

  /**
   * Maintenance message to display
   */
  @Prop({ default: 'We are currently performing maintenance. Please check back soon.' })
  maintenanceMessage: string;
}

export const SiteSettingsSchema = SchemaFactory.createForClass(SiteSettings);

