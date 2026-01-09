import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CategoryAttributeStats,
  CategoryAttributeStatsSchema,
  Attribute,
  AttributeSchema,
  Product,
  ProductSchema,
} from '@sellit/api-database';
import { CategoryStatsService } from './category-stats.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CategoryAttributeStats.name, schema: CategoryAttributeStatsSchema },
      { name: Attribute.name, schema: AttributeSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  providers: [CategoryStatsService],
  exports: [CategoryStatsService],
})
export class CategoryStatsModule {}

