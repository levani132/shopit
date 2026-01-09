import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsMongoId,
  Min,
  Max,
  IsEnum,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Interface for bilingual text (not a DTO class to avoid nested validation issues with FormData)
interface BilingualText {
  ka?: string;
  en?: string;
}

// Helper to parse JSON string or return object as-is
const parseJsonTransform = ({ value }: { value: unknown }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

export enum SortBy {
  RELEVANCE = 'relevance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  POPULARITY = 'popularity',
  NEWEST = 'newest',
}

// --- Variant DTOs (defined FIRST before they are referenced) ---

/**
 * DTO for specifying which attribute values a product uses
 */
export class ProductAttributeDto {
  @IsMongoId()
  attributeId!: string;

  @IsArray()
  @IsMongoId({ each: true })
  selectedValues!: string[];
}

/**
 * DTO for variant attribute value (denormalized)
 */
export class VariantAttributeValueDto {
  @IsMongoId()
  attributeId!: string;

  @IsString()
  attributeName!: string;

  @IsMongoId()
  valueId!: string;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  colorHex?: string;
}

/**
 * DTO for creating/updating a product variant
 */
export class ProductVariantDto {
  @IsOptional()
  @IsMongoId()
  _id?: string; // For updating existing variant

  @IsOptional()
  @IsString()
  sku?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeValueDto)
  attributes!: VariantAttributeValueDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating a single variant
 */
export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for bulk updating variants (with optional generation)
 */
export class BulkVariantsDto {
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean; // If true, regenerate all variants from productAttributes

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}

// --- Product DTOs ---

export class ListProductsDto {
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  subcategoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onSale?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @Transform(parseJsonTransform)
  @IsObject()
  nameLocalized?: BilingualText;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(parseJsonTransform)
  @IsObject()
  descriptionLocalized?: BilingualText;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOnSale?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  subcategoryId?: string;

  // --- Variant Support ---

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasVariants?: boolean;

  @IsOptional()
  @Transform(parseJsonTransform)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  productAttributes?: ProductAttributeDto[];

  @IsOptional()
  @Transform(parseJsonTransform)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(parseJsonTransform)
  @IsObject()
  nameLocalized?: BilingualText;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(parseJsonTransform)
  @IsObject()
  descriptionLocalized?: BilingualText;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOnSale?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  subcategoryId?: string;

  // Existing images to keep (sent as JSON string array)
  @IsOptional()
  @Transform(parseJsonTransform)
  existingImages?: string[];

  // --- Variant Support ---

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasVariants?: boolean;

  @IsOptional()
  @Transform(parseJsonTransform)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  productAttributes?: ProductAttributeDto[];

  @IsOptional()
  @Transform(parseJsonTransform)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}
