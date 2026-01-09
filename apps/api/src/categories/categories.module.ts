import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Category,
  CategorySchema,
  Subcategory,
  SubcategorySchema,
  Store,
  StoreSchema,
} from '@sellit/api-database';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryStatsModule } from '../category-stats/category-stats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Subcategory.name, schema: SubcategorySchema },
      { name: Store.name, schema: StoreSchema },
    ]),
    CategoryStatsModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}

