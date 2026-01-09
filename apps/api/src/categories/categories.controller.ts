import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
  ReorderCategoriesDto,
} from './dto/category.dto';
import { CategoryStatsService } from '../category-stats/category-stats.service';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly categoryStatsService: CategoryStatsService,
  ) {}

  /**
   * Get all categories for a store (public)
   */
  @Get('store/:storeId')
  async getByStore(@Param('storeId') storeId: string) {
    return this.categoriesService.findAllByStore(storeId);
  }

  /**
   * Get all categories for the current user's store
   */
  @Get('my-store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async getMyCategories(@Request() req: { user: { storeId: string } }) {
    return this.categoriesService.findAllByStore(req.user.storeId);
  }

  /**
   * Get a single category
   */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  /**
   * Get store-level filters (all products, regardless of category)
   * Used for "All Products" page or stores without categories
   */
  @Get('filters/store/:storeId')
  async getStoreFilters(@Param('storeId') storeId: string) {
    return this.categoryStatsService.getFiltersForStore(storeId);
  }

  /**
   * Get available filters for a category (public)
   * Returns attribute filters with product counts
   */
  @Get(':id/filters/:storeId')
  async getFilters(
    @Param('id') categoryId: string,
    @Param('storeId') storeId: string,
  ) {
    return this.categoryStatsService.getFiltersForCategory(categoryId, storeId);
  }

  /**
   * Create a new category
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async create(
    @Request() req: { user: { storeId: string } },
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(req.user.storeId, dto);
  }

  /**
   * Update a category
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async update(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, req.user.storeId, dto);
  }

  /**
   * Delete a category
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async delete(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
  ) {
    return this.categoriesService.delete(id, req.user.storeId);
  }

  /**
   * Reorder categories
   */
  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async reorder(
    @Request() req: { user: { storeId: string } },
    @Body() dto: ReorderCategoriesDto,
  ) {
    return this.categoriesService.reorder(req.user.storeId, dto.categoryIds);
  }

  // --- Subcategory endpoints ---

  /**
   * Create a subcategory
   */
  @Post('subcategory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async createSubcategory(
    @Request() req: { user: { storeId: string } },
    @Body() dto: CreateSubcategoryDto,
  ) {
    return this.categoriesService.createSubcategory(req.user.storeId, dto);
  }

  /**
   * Update a subcategory
   */
  @Patch('subcategory/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async updateSubcategory(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
    @Body() dto: UpdateSubcategoryDto,
  ) {
    return this.categoriesService.updateSubcategory(id, req.user.storeId, dto);
  }

  /**
   * Delete a subcategory
   */
  @Delete('subcategory/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async deleteSubcategory(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
  ) {
    return this.categoriesService.deleteSubcategory(id, req.user.storeId);
  }
}

