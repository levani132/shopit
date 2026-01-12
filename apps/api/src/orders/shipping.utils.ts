/**
 * Shipping rate calculation utilities
 * 
 * Rates are based on the vehicle type required for delivery:
 * - Bike/Motorcycle: Small items (≤5kg, ≤30cm each side) → 0.5 GEL/min
 * - Car: Medium items (≤20kg, ≤60cm each side) → 0.75 GEL/min
 * - Large Car/SUV: Large items (≤50kg, ≤100cm each side) → 1 GEL/min
 * - Van/Truck: Very large items (>50kg or >100cm) → 2 GEL/min
 */

export enum VehicleType {
  BIKE = 'bike',      // Motorcycle/bike delivery
  CAR = 'car',        // Regular car
  SUV = 'suv',        // Large car/SUV
  VAN = 'van',        // Van/truck
}

export interface ShippingDimensions {
  weight?: number;  // kg
  length?: number;  // cm
  width?: number;   // cm
  height?: number;  // cm
}

export interface ShippingRateResult {
  vehicleType: VehicleType;
  ratePerMinute: number;  // GEL per minute
  minimumFee: number;     // Minimum fee in GEL
}

// Vehicle type thresholds
const THRESHOLDS = {
  BIKE: {
    maxWeight: 5,       // kg
    maxDimension: 30,   // cm (any side)
  },
  CAR: {
    maxWeight: 20,      // kg
    maxDimension: 60,   // cm (any side)
  },
  SUV: {
    maxWeight: 50,      // kg
    maxDimension: 100,  // cm (any side)
  },
  // Anything larger requires a van
};

// Rates per minute (GEL)
const RATES = {
  [VehicleType.BIKE]: 0.5,
  [VehicleType.CAR]: 0.75,
  [VehicleType.SUV]: 1.0,
  [VehicleType.VAN]: 2.0,
};

// Minimum fees (GEL)
const MIN_FEES = {
  [VehicleType.BIKE]: 3,
  [VehicleType.CAR]: 5,
  [VehicleType.SUV]: 8,
  [VehicleType.VAN]: 15,
};

/**
 * Get the maximum dimension from length, width, height
 */
function getMaxDimension(dimensions: ShippingDimensions): number {
  const { length = 0, width = 0, height = 0 } = dimensions;
  return Math.max(length, width, height);
}

/**
 * Determine the vehicle type required for given dimensions
 */
export function getVehicleType(dimensions: ShippingDimensions): VehicleType {
  const weight = dimensions.weight || 0;
  const maxDim = getMaxDimension(dimensions);

  // Check from smallest to largest vehicle
  if (weight <= THRESHOLDS.BIKE.maxWeight && maxDim <= THRESHOLDS.BIKE.maxDimension) {
    return VehicleType.BIKE;
  }

  if (weight <= THRESHOLDS.CAR.maxWeight && maxDim <= THRESHOLDS.CAR.maxDimension) {
    return VehicleType.CAR;
  }

  if (weight <= THRESHOLDS.SUV.maxWeight && maxDim <= THRESHOLDS.SUV.maxDimension) {
    return VehicleType.SUV;
  }

  return VehicleType.VAN;
}

/**
 * Get shipping rate information for given dimensions
 */
export function getShippingRate(dimensions: ShippingDimensions): ShippingRateResult {
  const vehicleType = getVehicleType(dimensions);
  
  return {
    vehicleType,
    ratePerMinute: RATES[vehicleType],
    minimumFee: MIN_FEES[vehicleType],
  };
}

/**
 * Calculate shipping fee based on dimensions and travel time
 * @param dimensions - Product dimensions
 * @param travelTimeMinutes - Travel time in minutes
 * @returns Shipping fee in GEL (rounded up to nearest 0.5)
 */
export function calculateShippingFee(
  dimensions: ShippingDimensions,
  travelTimeMinutes: number,
): number {
  const { ratePerMinute, minimumFee } = getShippingRate(dimensions);
  
  // Calculate base fee
  const baseFee = travelTimeMinutes * ratePerMinute;
  
  // Apply minimum fee
  const fee = Math.max(baseFee, minimumFee);
  
  // Round up to nearest 0.5 GEL
  return Math.ceil(fee * 2) / 2;
}

/**
 * Get the largest vehicle type from multiple items
 * (The order needs to fit the largest item)
 */
export function getLargestVehicleType(items: ShippingDimensions[]): VehicleType {
  if (items.length === 0) {
    return VehicleType.BIKE; // Default to smallest
  }

  const vehicleTypes = items.map(getVehicleType);
  const vehicleOrder = [VehicleType.BIKE, VehicleType.CAR, VehicleType.SUV, VehicleType.VAN];
  
  // Find the index of the largest vehicle needed
  let maxIndex = 0;
  for (const vt of vehicleTypes) {
    const index = vehicleOrder.indexOf(vt);
    if (index > maxIndex) {
      maxIndex = index;
    }
  }
  
  return vehicleOrder[maxIndex];
}

/**
 * Calculate shipping fee for multiple items
 * Uses the largest vehicle type required for any item
 */
export function calculateOrderShippingFee(
  items: ShippingDimensions[],
  travelTimeMinutes: number,
): { fee: number; vehicleType: VehicleType; ratePerMinute: number } {
  const vehicleType = getLargestVehicleType(items);
  const ratePerMinute = RATES[vehicleType];
  const minimumFee = MIN_FEES[vehicleType];
  
  // Calculate base fee
  const baseFee = travelTimeMinutes * ratePerMinute;
  
  // Apply minimum fee
  const rawFee = Math.max(baseFee, minimumFee);
  
  // Round up to nearest 0.5 GEL
  const fee = Math.ceil(rawFee * 2) / 2;
  
  return { fee, vehicleType, ratePerMinute };
}

