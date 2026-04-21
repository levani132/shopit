import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BilingualTextDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ka?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  en?: string;
}

class TemplatePricingDto {
  @ApiProperty({ enum: ['free', 'monthly', 'one_time'] })
  @IsEnum(['free', 'monthly', 'one_time'])
  type!: 'free' | 'monthly' | 'one_time';

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateTemplateListingDto {
  @ApiProperty({ example: 'elegant-boutique', description: 'Unique URL-friendly slug' })
  @IsNotEmpty({ message: 'Template slug is required' })
  @IsString()
  @MaxLength(100)
  templateSlug!: string;

  @ApiProperty({ description: 'Template name in Georgian and/or English' })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name!: BilingualTextDto;

  @ApiProperty({ description: 'Short description' })
  @ValidateNested()
  @Type(() => BilingualTextDto)
  description!: BilingualTextDto;

  @ApiPropertyOptional({ description: 'Long description (rich text)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  longDescription?: BilingualTextDto;

  @ApiProperty({ description: 'Pricing information' })
  @ValidateNested()
  @Type(() => TemplatePricingDto)
  pricing!: TemplatePricingDto;

  @ApiPropertyOptional({ example: ['fashion', 'electronics'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: ['minimal', 'modern'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'https://github.com/user/template' })
  @IsOptional()
  @IsString()
  githubRepo?: string;
}

export class UpdateTemplateListingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  name?: BilingualTextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  description?: BilingualTextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  longDescription?: BilingualTextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  screenshots?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  demoStoreUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplatePricingDto)
  pricing?: TemplatePricingDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  githubRepo?: string;
}
