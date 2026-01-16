/**
 * Vehicle types for couriers
 * Sorted by carrying capacity (smallest to largest)
 * Aligned with product shipping sizes
 */
export const VEHICLE_TYPES = [
  'walking',
  'bicycle',
  'motorcycle',
  'car',
  'suv',
  'van',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

/**
 * Shipping size categories for products
 */
export const SHIPPING_SIZES = [
  'small',
  'medium',
  'large',
  'extra_large',
] as const;

export type ShippingSize = (typeof SHIPPING_SIZES)[number];

/**
 * Vehicle capacity rules
 * Defines how many items of each size a vehicle can carry
 * -1 means unlimited
 */
export interface VehicleCapacity {
  small: number;
  medium: number;
  large: number;
  extra_large: number;
}

export const VEHICLE_CAPACITIES: Record<VehicleType, VehicleCapacity> = {
  walking: {
    small: 5,
    medium: 0,
    large: 0,
    extra_large: 0,
  },
  bicycle: {
    small: 5,
    medium: 0,
    large: 0,
    extra_large: 0,
  },
  motorcycle: {
    small: 5,
    medium: 0,
    large: 0,
    extra_large: 0,
  },
  car: {
    small: -1, // unlimited
    medium: 3,
    large: 0,
    extra_large: 0,
  },
  suv: {
    small: -1, // unlimited
    medium: -1, // unlimited
    large: 2,
    extra_large: 0,
  },
  van: {
    small: -1, // unlimited
    medium: -1, // unlimited
    large: -1, // unlimited
    extra_large: 2,
  },
};

/**
 * Get the minimum required vehicle type for a given shipping size
 */
export function getMinimumVehicleForSize(size: ShippingSize): VehicleType {
  switch (size) {
    case 'extra_large':
      return 'van';
    case 'large':
      return 'suv';
    case 'medium':
      return 'car';
    case 'small':
    default:
      return 'walking';
  }
}

/**
 * Check if a vehicle can handle a specific order based on item sizes
 * @param vehicleType The courier's vehicle type
 * @param items Array of items with their shipping sizes and quantities
 * @returns true if the vehicle can handle all items
 */
export function canVehicleHandleOrder(
  vehicleType: VehicleType,
  items: Array<{ shippingSize: ShippingSize; qty: number }>,
): boolean {
  const capacity = VEHICLE_CAPACITIES[vehicleType];

  // Count items by size
  const counts: Record<ShippingSize, number> = {
    small: 0,
    medium: 0,
    large: 0,
    extra_large: 0,
  };

  for (const item of items) {
    counts[item.shippingSize] += item.qty;
  }

  // Check each size
  for (const size of SHIPPING_SIZES) {
    const maxCapacity = capacity[size];
    const requiredCount = counts[size];

    if (maxCapacity === 0 && requiredCount > 0) {
      // Vehicle cannot carry this size at all
      return false;
    }

    if (maxCapacity > 0 && requiredCount > maxCapacity) {
      // Vehicle can carry this size but not enough
      return false;
    }

    // If maxCapacity is -1 (unlimited), always pass
  }

  return true;
}

/**
 * Get the vehicle type emoji
 */
export function getVehicleEmoji(vehicleType: VehicleType): string {
  switch (vehicleType) {
    case 'walking':
      return '🚶';
    case 'bicycle':
      return '🚲';
    case 'motorcycle':
      return '🏍️';
    case 'car':
      return '🚗';
    case 'suv':
      return '🚙';
    case 'van':
      return '🚐';
    default:
      return '🚗';
  }
}

/**
 * Get vehicle types that can handle a given shipping size
 */
export function getCompatibleVehicles(size: ShippingSize): VehicleType[] {
  const minVehicleIndex = VEHICLE_TYPES.indexOf(getMinimumVehicleForSize(size));
  return [...VEHICLE_TYPES.slice(minVehicleIndex)];
}
