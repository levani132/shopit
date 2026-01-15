import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SiteSettingsService } from '../admin/site-settings.service';

/**
 * Location coordinates
 */
export interface Location {
  lat: number;
  lng: number;
}

/**
 * Shipping size categories
 * Maps to vehicle types for delivery
 */
export type ShippingSize = 'small' | 'medium' | 'large' | 'extra_large';

/**
 * Delivery fee calculation result
 */
export interface DeliveryFeeResult {
  fee: number; // Fee in GEL
  durationMinutes: number; // Driving duration in minutes
  distanceKm: number; // Distance in kilometers
  vehicleType?: string; // Vehicle type used for calculation
}

/**
 * Service for calculating delivery fees based on distance/duration
 * Uses OpenRouteService API (free tier: 2000 requests/day)
 *
 * Pricing formula (configurable via admin):
 * - Rate per minute of driving time (default: 0.5 GEL)
 * - Minimum fee (default: 3 GEL)
 * - Precision for rounding (default: 0.5 GEL)
 */
@Injectable()
export class DeliveryFeeService {
  private readonly logger = new Logger(DeliveryFeeService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openrouteservice.org/v2';

  constructor(
    private configService: ConfigService,
    private siteSettingsService: SiteSettingsService,
  ) {
    this.apiKey = this.configService.get<string>('OPENROUTE_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn(
        'OPENROUTE_API_KEY not configured. Delivery fee calculation will use fallback.',
      );
    }
  }

  /**
   * Calculate delivery fee based on driving time between two locations
   * @param origin Store location
   * @param destination Customer location
   * @param shippingSize Product shipping size category (default: 'small')
   */
  async calculateDeliveryFee(
    origin: Location,
    destination: Location,
    shippingSize: ShippingSize = 'small',
  ): Promise<DeliveryFeeResult> {
    try {
      if (!this.apiKey) {
        return this.getFallbackFee(shippingSize);
      }

      // Call OpenRouteService Directions API
      // Using GET endpoint with GeoJSON response format
      const url = `${this.baseUrl}/directions/driving-car?` +
        `start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}`;
      
      this.logger.debug(`Calling OpenRouteService: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.apiKey,
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unable to read error body');
        this.logger.error(
          `OpenRouteService API error: ${response.status} ${response.statusText}. Body: ${errorBody}`,
        );
        return this.getFallbackFee(shippingSize);
      }

      const data = await response.json();

      // Extract duration and distance from response
      // Duration is in seconds, distance is in meters
      const summary = data?.features?.[0]?.properties?.summary;
      if (!summary) {
        this.logger.error('Invalid response from OpenRouteService');
        return this.getFallbackFee(shippingSize);
      }

      const durationMinutes = Math.ceil(summary.duration / 60);
      const distanceKm = Math.round((summary.distance / 1000) * 10) / 10;

      // Calculate fee using configurable settings based on shipping size
      const { fee, vehicleType } = await this.calculateFee(durationMinutes, shippingSize);

      this.logger.debug(
        `Delivery fee calculated: ${fee} GEL for ${durationMinutes} min (${distanceKm} km) - ${vehicleType}`,
      );

      return {
        fee,
        durationMinutes,
        distanceKm,
        vehicleType,
      };
    } catch (error) {
      this.logger.error('Failed to calculate delivery fee:', error);
      return this.getFallbackFee(shippingSize);
    }
  }

  /**
   * Calculate fee from duration in minutes based on shipping size
   * Uses configurable rates from SiteSettings for different vehicle types
   */
  private async calculateFee(
    durationMinutes: number,
    shippingSize: ShippingSize,
  ): Promise<{ fee: number; vehicleType: string }> {
    const settings = await this.siteSettingsService.getSettings();
    const precision = settings.deliveryFeePrecision || 0.5;

    // Get rate and minimum fee based on shipping size
    let ratePerMinute: number;
    let minimumFee: number;
    let vehicleType: string;

    switch (shippingSize) {
      case 'extra_large':
        ratePerMinute = settings.vanShipping?.ratePerMinute || 2.0;
        minimumFee = settings.vanShipping?.minimumFee || 15;
        vehicleType = 'van';
        break;
      case 'large':
        ratePerMinute = settings.suvShipping?.ratePerMinute || 1.0;
        minimumFee = settings.suvShipping?.minimumFee || 8;
        vehicleType = 'suv';
        break;
      case 'medium':
        ratePerMinute = settings.carShipping?.ratePerMinute || 0.75;
        minimumFee = settings.carShipping?.minimumFee || 5;
        vehicleType = 'car';
        break;
      case 'small':
      default:
        ratePerMinute = settings.bikeShipping?.ratePerMinute || 0.5;
        minimumFee = settings.bikeShipping?.minimumFee || 3;
        vehicleType = 'bike';
        break;
    }

    const rawFee = durationMinutes * ratePerMinute;
    const fee = Math.max(minimumFee, rawFee);
    // Ceil to precision (e.g., 0.5 GEL)
    return {
      fee: Math.ceil(fee / precision) * precision,
      vehicleType,
    };
  }

  /**
   * Fallback fee when API is unavailable
   */
  private async getFallbackFee(
    shippingSize: ShippingSize = 'small',
  ): Promise<DeliveryFeeResult> {
    const { fee, vehicleType } = await this.calculateFee(15, shippingSize); // Assume 15 min drive
    return {
      fee: fee + 2, // Add small buffer for uncertainty
      durationMinutes: 15, // Estimated
      distanceKm: 5, // Estimated
      vehicleType,
    };
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get estimated delivery time range based on duration and prep time
   */
  getDeliveryTimeEstimate(
    durationMinutes: number,
    prepTimeMinDays: number,
    prepTimeMaxDays: number,
  ): { minDays: number; maxDays: number } {
    // Convert driving time to days (assume 8 hours per day, round up)
    const deliveryDays = Math.ceil(durationMinutes / (8 * 60));

    return {
      minDays: prepTimeMinDays + deliveryDays,
      maxDays: prepTimeMaxDays + deliveryDays,
    };
  }
}

