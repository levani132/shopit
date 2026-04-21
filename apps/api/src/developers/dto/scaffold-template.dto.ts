import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScaffoldTemplateDto {
  @ApiProperty({ example: 'my-template', description: 'Template slug (lowercase, hyphens)' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens, not start or end with a hyphen',
  })
  slug!: string;

  @ApiProperty({ example: 'My Template' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'A beautiful store template' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ['general', 'fashion', 'electronics', 'food', 'services', 'handmade', 'other'], default: 'general' })
  @IsOptional()
  @IsEnum(['general', 'fashion', 'electronics', 'food', 'services', 'handmade', 'other'])
  category?: string;

  @ApiProperty({ enum: ['free', 'monthly', 'one_time'], default: 'free' })
  @IsOptional()
  @IsEnum(['free', 'monthly', 'one_time'])
  pricingType?: string;
}
