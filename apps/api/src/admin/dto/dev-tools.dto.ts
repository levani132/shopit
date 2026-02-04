import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CleanupLevel {
  LEVEL_1 = 'level_1', // Orders & Balances
  LEVEL_2 = 'level_2', // Products, Categories, Attributes
  LEVEL_3 = 'level_3', // Users & Stores (nuclear option)
}

export enum SeedLevel {
  USERS = 'users', // Seed users with different roles
  PRODUCTS = 'products', // Seed products, categories, attributes
  ORDERS = 'orders', // Seed orders
}

export class CleanupDto {
  @ApiProperty({
    enum: CleanupLevel,
    description:
      'Level 1: Orders & Balances | Level 2: Products & Categories | Level 3: Users & Stores',
  })
  @IsEnum(CleanupLevel)
  level!: CleanupLevel;
}

export class SeedUsersDto {
  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  count?: number;

  @ApiProperty({ required: false, default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  sellers?: number;

  @ApiProperty({ required: false, default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  couriers?: number;
}

export class SeedProductsDto {
  @ApiProperty({ required: false, default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  count?: number;
}

export class SeedOrdersDto {
  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  count?: number;
}
