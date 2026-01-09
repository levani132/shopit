import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  IsMongoId,
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

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  nameLocalized?: BilingualTextDto;

  @IsOptional()
  @IsString()
  slug?: string; // Auto-generated if not provided

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class UpdateCategoryDto {
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
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}

export class CreateSubcategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  nameLocalized?: BilingualTextDto;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;

  @IsMongoId()
  categoryId!: string;
}

export class UpdateSubcategoryDto {
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
  @IsNumber()
  @Min(0)
  order?: number;
}

export class ReorderCategoriesDto {
  @IsMongoId({ each: true })
  categoryIds!: string[];
}

