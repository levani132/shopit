import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// ================== ORDER ITEM DTOs ==================

export class OrderItemVariantAttributeDto {
  @IsString()
  @IsNotEmpty()
  attributeName!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsOptional()
  colorHex?: string;
}

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsNotEmpty()
  image!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @Min(1)
  qty!: number;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemVariantAttributeDto)
  @IsOptional()
  variantAttributes?: OrderItemVariantAttributeDto[];

  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @IsString()
  @IsNotEmpty()
  storeName!: string;
}

// ================== SHIPPING DTOs ==================

export class ShippingLocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

export class ShippingDetailsDto {
  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  // Location coordinates for delivery fee calculation
  @ValidateNested()
  @Type(() => ShippingLocationDto)
  @IsOptional()
  location?: ShippingLocationDto;
}

// ================== GUEST INFO DTOs ==================

export class GuestInfoDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;
}

// ================== CREATE ORDER DTOs ==================

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsNotEmpty()
  orderItems!: CreateOrderItemDto[];

  @ValidateNested()
  @Type(() => ShippingDetailsDto)
  @IsNotEmpty()
  shippingDetails!: ShippingDetailsDto;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  // Delivery method: 'delivery' (home delivery) or 'pickup' (self-pickup from store)
  @IsString()
  @IsOptional()
  deliveryMethod?: 'delivery' | 'pickup';

  // Guest checkout info (required if not authenticated)
  @ValidateNested()
  @Type(() => GuestInfoDto)
  @IsOptional()
  guestInfo?: GuestInfoDto;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isGuestOrder?: boolean;
}

// ================== PAYMENT DTOs ==================

export class InitiatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsOptional()
  successUrl?: string;

  @IsString()
  @IsOptional()
  failUrl?: string;
}

export class PaymentCallbackDto {
  @IsOptional()
  body?: {
    external_order_id?: string;
    order_id?: string;
    order_status?: {
      key?: string;
      description?: string;
    };
  };
}

// ================== SHIPPING CALCULATION DTOs ==================

export class LocationDto {
  @IsNumber()
  @IsNotEmpty()
  lat!: number;

  @IsNumber()
  @IsNotEmpty()
  lng!: number;
}

export class ShippingProductDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CalculateShippingDto {
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  storeLocation!: LocationDto;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  customerLocation!: LocationDto;

  // Product IDs to fetch current shippingSize from database
  // This ensures we always use the latest product sizes
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingProductDto)
  @IsOptional()
  products?: ShippingProductDto[];

  // Fallback: direct shipping size (deprecated, use products instead)
  @IsString()
  @IsIn(['small', 'medium', 'large', 'extra_large'])
  @IsOptional()
  shippingSize?: 'small' | 'medium' | 'large' | 'extra_large';
}

// ================== CART VALIDATION DTOs ==================

export class ValidateCartItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  variantId?: string;
}

export class ValidateCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateCartItemDto)
  @IsNotEmpty()
  items!: ValidateCartItemDto[];
}

// ================== RESPONSE DTOs ==================

export class OrderResponseDto {
  id!: string;
  orderItems!: any[];
  shippingDetails!: any;
  paymentMethod!: string;
  itemsPrice!: number;
  shippingPrice!: number;
  taxPrice!: number;
  totalPrice!: number;
  status!: string;
  isPaid!: boolean;
  paidAt?: Date;
  isDelivered!: boolean;
  deliveredAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

