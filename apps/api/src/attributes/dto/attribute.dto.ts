import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  IsMongoId,
  IsEnum,
  IsBoolean,
  IsArray,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class BilingualTextDto {
  @IsOptional()
  @IsString()
  ka?: string;

  @IsOptional()
  @IsString()
  en?: string;
}

/**
 * DTO for creating/updating an attribute value
 */
export class AttributeValueDto {
  @IsOptional()
  @IsMongoId()
  _id?: string; // For updates - existing value ID

  @IsString()
  value!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  valueLocalized?: BilingualTextDto;

  @IsOptional()
  @IsString()
  slug?: string; // Auto-generated if not provided

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'colorHex must be a valid hex color (e.g., #FF0000)',
  })
  colorHex?: string; // Only for color type

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

/**
 * DTO for creating a new attribute
 */
export class CreateAttributeDto {
  @IsString()
  name!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  nameLocalized?: BilingualTextDto;

  @IsOptional()
  @IsString()
  slug?: string; // Auto-generated if not provided

  @IsEnum(['text', 'color'])
  type!: 'text' | 'color';

  @IsOptional()
  @IsBoolean()
  requiresImage?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueDto)
  values?: AttributeValueDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

/**
 * DTO for updating an attribute
 */
export class UpdateAttributeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  nameLocalized?: BilingualTextDto;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(['text', 'color'])
  type?: 'text' | 'color';

  @IsOptional()
  @IsBoolean()
  requiresImage?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

/**
 * DTO for adding a value to an attribute
 */
export class AddAttributeValueDto {
  @IsString()
  value!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  valueLocalized?: BilingualTextDto;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'colorHex must be a valid hex color (e.g., #FF0000)',
  })
  colorHex?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

/**
 * DTO for updating a value
 */
export class UpdateAttributeValueDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  valueLocalized?: BilingualTextDto;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'colorHex must be a valid hex color (e.g., #FF0000)',
  })
  colorHex?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

/**
 * DTO for reordering attributes
 */
export class ReorderAttributesDto {
  @IsMongoId({ each: true })
  attributeIds!: string[];
}

/**
 * DTO for reordering attribute values
 */
export class ReorderAttributeValuesDto {
  @IsMongoId({ each: true })
  valueIds!: string[];
}

