import { Role } from '@sellit/constants';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { ProductsService } from './products.service';
import {
  ListProductsDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateVariantDto,
  BulkVariantsDto,
} from './dto/product.dto';
import { UploadService } from '../upload/upload.service';
import 'multer';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * List products for a store (public) with filtering and sorting
   */
  @Get('store/:storeId')
  async listByStore(
    @Param('storeId') storeId: string,
    @Query() query: ListProductsDto,
  ) {
    return this.productsService.listProducts(storeId, query);
  }

  /**
   * Get homepage products for a store (public)
   * Returns up to 6 products based on store's configured order
   */
  @Get('store/:storeId/homepage')
  async getHomepageProducts(
    @Param('storeId') storeId: string,
    @Query('order') order?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getHomepageProducts(
      storeId,
      order || 'popular',
      limit ? parseInt(limit, 10) : 6,
    );
  }

  /**
   * Get all products for current user's store (dashboard)
   */
  @Get('my-store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async getMyProducts(@Request() req: { user: { storeId: string } }) {
    return this.productsService.findByStore(req.user.storeId);
  }

  /**
   * Get a single product (public)
   */
  @Get(':id')
  async getOne(@Param('id') id: string, @Query('storeId') storeId?: string) {
    return this.productsService.findById(id, storeId);
  }

  /**
   * Increment view count for a product (public)
   */
  @Post(':id/view')
  async incrementView(@Param('id') id: string) {
    return this.productsService.incrementViewCount(id);
  }

  /**
   * Create a new product
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
      { name: 'variantImages', maxCount: 50 },
    ]),
  )
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; variantImages?: Express.Multer.File[] },
    @Request() req: { user: { storeId: string } },
  ) {
    let imageUrls: string[] = [];

    // Upload main product images
    if (files?.images && files.images.length > 0) {
      const uploadPromises = files.images.map((file) =>
        this.uploadService.uploadFile(file, {
          folder: 'products',
          maxSizeBytes: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      );
      const results = await Promise.all(uploadPromises);
      imageUrls = results.map((r) => r.url);
    }

    // Upload variant images and organize by group key
    let variantImagesByGroup: Record<string, string[]> | undefined;
    if (files?.variantImages && files.variantImages.length > 0 && dto.variantImageMapping) {
      const mapping: Record<string, number> =
        typeof dto.variantImageMapping === 'string'
          ? JSON.parse(dto.variantImageMapping)
          : dto.variantImageMapping;

      // Upload all variant images
      const uploadPromises = files.variantImages.map((file) =>
        this.uploadService.uploadFile(file, {
          folder: 'products/variants',
          maxSizeBytes: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      );
      const results = await Promise.all(uploadPromises);
      const variantImageUrls = results.map((r) => r.url);

      // Distribute URLs according to mapping
      variantImagesByGroup = {};
      let currentIndex = 0;
      for (const [groupKey, count] of Object.entries(mapping)) {
        variantImagesByGroup[groupKey] = variantImageUrls.slice(
          currentIndex,
          currentIndex + count,
        );
        currentIndex += count;
      }
    }

    return this.productsService.create(
      req.user.storeId,
      dto,
      imageUrls,
      variantImagesByGroup,
    );
  }

  /**
   * Update a product
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
      { name: 'variantImages', maxCount: 50 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; variantImages?: Express.Multer.File[] },
    @Request() req: { user: { storeId: string } },
  ) {
    let imageUrls: string[] | undefined;

    // Upload main product images
    if (files?.images && files.images.length > 0) {
      const uploadPromises = files.images.map((file) =>
        this.uploadService.uploadFile(file, {
          folder: 'products',
          maxSizeBytes: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      );
      const results = await Promise.all(uploadPromises);
      imageUrls = results.map((r) => r.url);
    }

    // Upload variant images and organize by group key
    let variantImagesByGroup: Record<string, string[]> | undefined;
    if (files?.variantImages && files.variantImages.length > 0 && dto.variantImageMapping) {
      const mapping: Record<string, number> =
        typeof dto.variantImageMapping === 'string'
          ? JSON.parse(dto.variantImageMapping)
          : dto.variantImageMapping;

      const uploadPromises = files.variantImages.map((file) =>
        this.uploadService.uploadFile(file, {
          folder: 'products/variants',
          maxSizeBytes: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      );
      const results = await Promise.all(uploadPromises);
      const variantImageUrls = results.map((r) => r.url);

      variantImagesByGroup = {};
      let currentIndex = 0;
      for (const [groupKey, count] of Object.entries(mapping)) {
        variantImagesByGroup[groupKey] = variantImageUrls.slice(
          currentIndex,
          currentIndex + count,
        );
        currentIndex += count;
      }
    }

    return this.productsService.update(
      id,
      req.user.storeId,
      dto,
      imageUrls,
      variantImagesByGroup,
    );
  }

  /**
   * Delete a product
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async delete(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
  ) {
    return this.productsService.delete(id, req.user.storeId);
  }

  // --- Variant Endpoints ---

  /**
   * Get variants for a product (public)
   */
  @Get(':id/variants')
  async getVariants(@Param('id') id: string) {
    return this.productsService.getVariants(id);
  }

  /**
   * Generate variants from product attributes
   */
  @Post(':id/variants/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async generateVariants(
    @Param('id') id: string,
    @Request() req: { user: { storeId: string } },
  ) {
    return this.productsService.generateVariants(id, req.user.storeId);
  }

  /**
   * Bulk update variants (or regenerate)
   */
  @Post(':id/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async bulkUpdateVariants(
    @Param('id') id: string,
    @Body() dto: BulkVariantsDto,
    @Request() req: { user: { storeId: string } },
  ) {
    return this.productsService.bulkUpdateVariants(id, req.user.storeId, dto);
  }

  /**
   * Update a single variant
   */
  @Patch(':id/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
    @Request() req: { user: { storeId: string } },
  ) {
    return this.productsService.updateVariant(id, variantId, req.user.storeId, dto);
  }

  /**
   * Delete a variant
   */
  @Delete(':id/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async deleteVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Request() req: { user: { storeId: string } },
  ) {
    return this.productsService.deleteVariant(id, variantId, req.user.storeId);
  }
}
