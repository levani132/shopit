import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SiteSettings,
  SiteSettingsDocument,
  VehicleShippingConfig,
} from '@sellit/api-database';

/**
 * Service for managing site-wide settings
 * Provides a singleton pattern - ensures only one settings document exists
 */
@Injectable()
export class SiteSettingsService implements OnModuleInit {
  private readonly logger = new Logger(SiteSettingsService.name);
  private cachedSettings: SiteSettingsDocument | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // Cache for 1 minute

  constructor(
    @InjectModel(SiteSettings.name)
    private readonly settingsModel: Model<SiteSettingsDocument>,
  ) {}

  /**
   * Initialize default settings on module startup
   */
  async onModuleInit() {
    await this.ensureSettingsExist();
  }

  /**
   * Ensure settings document exists, create with defaults if not
   */
  private async ensureSettingsExist(): Promise<SiteSettingsDocument> {
    let settings = await this.settingsModel.findOne();

    if (!settings) {
      this.logger.log('Creating default site settings...');
      settings = await this.settingsModel.create({});
      this.logger.log('Default site settings created');
    }

    return settings;
  }

  /**
   * Get current site settings (with caching)
   */
  async getSettings(): Promise<SiteSettingsDocument> {
    const now = Date.now();

    // Return cached settings if still valid
    if (this.cachedSettings && this.cacheExpiry > now) {
      return this.cachedSettings;
    }

    // Fetch fresh settings
    const settings = await this.ensureSettingsExist();
    this.cachedSettings = settings;
    this.cacheExpiry = now + this.CACHE_TTL;

    return settings;
  }

  /**
   * Update site settings
   */
  async updateSettings(
    updates: Partial<SiteSettings>,
  ): Promise<SiteSettingsDocument> {
    const settings = await this.ensureSettingsExist();

    // Apply updates
    Object.assign(settings, updates);
    await settings.save();

    // Invalidate cache
    this.cachedSettings = null;
    this.cacheExpiry = 0;

    this.logger.log('Site settings updated');
    return settings;
  }

  /**
   * Get site commission rate
   */
  async getSiteCommissionRate(): Promise<number> {
    const settings = await this.getSettings();
    return settings.siteCommissionRate;
  }

  /**
   * Get courier earnings percentage (0.0 - 1.0)
   */
  async getCourierEarningsPercentage(): Promise<number> {
    const settings = await this.getSettings();
    return settings.courierEarningsPercentage;
  }

  /**
   * Get shipping config for a specific vehicle type
   */
  async getShippingConfig(
    vehicleType: 'bike' | 'car' | 'suv' | 'van',
  ): Promise<VehicleShippingConfig> {
    const settings = await this.getSettings();
    switch (vehicleType) {
      case 'bike':
        return settings.bikeShipping;
      case 'car':
        return settings.carShipping;
      case 'suv':
        return settings.suvShipping;
      case 'van':
        return settings.vanShipping;
      default:
        return settings.bikeShipping;
    }
  }

  /**
   * Get all shipping configs
   */
  async getAllShippingConfigs(): Promise<{
    bike: VehicleShippingConfig;
    car: VehicleShippingConfig;
    suv: VehicleShippingConfig;
    van: VehicleShippingConfig;
  }> {
    const settings = await this.getSettings();
    return {
      bike: settings.bikeShipping,
      car: settings.carShipping,
      suv: settings.suvShipping,
      van: settings.vanShipping,
    };
  }

  /**
   * Get delivery fee settings
   */
  async getDeliveryFeeSettings(): Promise<{
    ratePerMinute: number;
    minimumFee: number;
    precision: number;
  }> {
    const settings = await this.getSettings();
    return {
      ratePerMinute: settings.defaultDeliveryRatePerMinute,
      minimumFee: settings.minimumDeliveryFee,
      precision: settings.deliveryFeePrecision,
    };
  }

  /**
   * Get subdomain change settings
   */
  async getSubdomainChangeSettings(): Promise<{
    freeChanges: number;
    price: number;
  }> {
    const settings = await this.getSettings();
    return {
      freeChanges: settings.freeSubdomainChanges,
      price: settings.subdomainChangePrice,
    };
  }

  /**
   * Get subdomain change price
   */
  async getSubdomainChangePrice(): Promise<number> {
    const settings = await this.getSettings();
    return settings.subdomainChangePrice;
  }

  /**
   * Get minimum withdrawal amount
   */
  async getMinimumWithdrawalAmount(): Promise<number> {
    const settings = await this.getSettings();
    return settings.minimumWithdrawalAmount;
  }

  /**
   * Check if store registrations are allowed
   */
  async isStoreRegistrationAllowed(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.allowStoreRegistrations;
  }

  /**
   * Check if courier registrations are allowed
   */
  async isCourierRegistrationAllowed(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.allowCourierRegistrations;
  }

  /**
   * Check if site is in maintenance mode
   */
  async isMaintenanceMode(): Promise<{
    enabled: boolean;
    message: string;
  }> {
    const settings = await this.getSettings();
    return {
      enabled: settings.maintenanceMode,
      message: settings.maintenanceMessage,
    };
  }

  /**
   * Invalidate cache (call after direct DB updates)
   */
  invalidateCache(): void {
    this.cachedSettings = null;
    this.cacheExpiry = 0;
  }
}
