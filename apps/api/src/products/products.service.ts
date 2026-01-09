import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Product, ProductDocument, Attribute, AttributeDocument } from '@sellit/api-database';
import {
  ListProductsDto,
  CreateProductDto,
  UpdateProductDto,
  SortBy,
  UpdateVariantDto,
  BulkVariantsDto,
} from './dto/product.dto';
import { CategoryStatsService } from '../category-stats/category-stats.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Attribute.name) private attributeModel: Model<AttributeDocument>,
    @Inject(forwardRef(() => CategoryStatsService))
    private categoryStatsService: CategoryStatsService,
  ) {}

  /**
   * Parse attribute filter string into structured format
   * Format: attributeSlug:valueSlug,valueSlug|attributeSlug:valueSlug
   */
  private parseAttributeFilters(
    attributes: string,
  ): Map<string, string[]> {
    const result = new Map<string, string[]>();

    if (!attributes) return result;

    const attrParts = attributes.split('|');
    for (const part of attrParts) {
      const [attrSlug, valuesStr] = part.split(':');
      if (attrSlug && valuesStr) {
        const values = valuesStr.split(',').filter((v) => v.trim());
        if (values.length > 0) {
          result.set(attrSlug, values);
        }
      }
    }

    return result;
  }

  /**
   * List products with filtering, sorting, and pagination
   */
  async listProducts(storeId: string, dto: ListProductsDto) {
    const {
      categoryId,
      subcategoryId,
      minPrice,
      maxPrice,
      sortBy = SortBy.RELEVANCE,
      search,
      onSale,
      inStock,
      attributes,
      page = 1,
      limit = 20,
    } = dto;

    // Build filter query
    const filter: FilterQuery<ProductDocument> = {
      storeId: new Types.ObjectId(storeId),
      isActive: true,
    };

    // Category filter
    if (categoryId) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }

    // Subcategory filter
    if (subcategoryId) {
      filter.subcategoryId = new Types.ObjectId(subcategoryId);
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        filter.price.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        filter.price.$lte = maxPrice;
      }
    }

    // On sale filter
    if (onSale === true) {
      filter.isOnSale = true;
    }

    // In stock filter - check both stock and totalStock (for variant products)
    if (inStock === true) {
      filter.$or = [
        { hasVariants: false, stock: { $gt: 0 } },
        { hasVariants: true, totalStock: { $gt: 0 } },
        { hasVariants: { $exists: false }, stock: { $gt: 0 } },
      ];
    }

    // Attribute filter (faceted search)
    if (attributes) {
      const attrFilters = this.parseAttributeFilters(attributes);

      if (attrFilters.size > 0) {
        // We need to find products that have variants matching the selected attribute values
        // Using $elemMatch on variants.attributes for each attribute filter
        const attrConditions: FilterQuery<ProductDocument>[] = [];

        for (const [_attrSlug, valueIds] of attrFilters) {
          // Match products where at least one variant has any of the selected values
          // Note: We're matching by valueId or value slug depending on what frontend sends
          attrConditions.push({
            'variants.attributes': {
              $elemMatch: {
                $or: [
                  { valueId: { $in: valueIds.map((v) => new Types.ObjectId(v)) } },
                  // Also try matching by value string for flexibility
                ],
              },
            },
          });
        }

        if (attrConditions.length > 0) {
          filter.$and = filter.$and || [];
          filter.$and.push(...attrConditions);
        }
      }
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort
    let sort: Record<string, 1 | -1 | { $meta: 'textScore' }> = {};
    switch (sortBy) {
      case SortBy.PRICE_ASC:
        sort = { price: 1 };
        break;
      case SortBy.PRICE_DESC:
        sort = { price: -1 };
        break;
      case SortBy.POPULARITY:
        sort = { viewCount: -1, orderCount: -1 };
        break;
      case SortBy.NEWEST:
        sort = { createdAt: -1 } as Record<string, 1 | -1>;
        break;
      case SortBy.RELEVANCE:
      default:
        if (search) {
          sort = { score: { $meta: 'textScore' } };
        } else {
          sort = { viewCount: -1 }; // Default to popularity when no search
        }
        break;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name nameLocalized slug')
        .populate('subcategoryId', 'name nameLocalized slug')
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    // Get price range for filters
    const priceStats = await this.productModel.aggregate([
      { $match: { storeId: new Types.ObjectId(storeId), isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0 },
      },
    };
  }

  /**
   * Get a single product by ID
   */
  async findById(productId: string, storeId?: string) {
    const filter: FilterQuery<ProductDocument> = {
      _id: new Types.ObjectId(productId),
    };

    if (storeId) {
      filter.storeId = new Types.ObjectId(storeId);
    }

    const product = await this.productModel
      .findOne(filter)
      .populate('categoryId', 'name nameLocalized slug')
      .populate('subcategoryId', 'name nameLocalized slug')
      .lean();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  /**
   * Increment view count for a product
   */
  async incrementViewCount(productId: string) {
    const result = await this.productModel.findByIdAndUpdate(
      productId,
      { $inc: { viewCount: 1 } },
      { new: true },
    );

    if (!result) {
      throw new NotFoundException('Product not found');
    }

    return { viewCount: result.viewCount };
  }

  /**
   * Create a new product
   */
  async create(storeId: string, dto: CreateProductDto, images?: string[]) {
    // Process variants if provided
    let variants = [];
    let totalStock = dto.stock ?? 0;
    let hasVariants = dto.hasVariants ?? false;

    if (dto.variants && dto.variants.length > 0) {
      hasVariants = true;
      variants = dto.variants.map((v) => ({
        _id: new Types.ObjectId(),
        sku: v.sku,
        attributes: v.attributes.map((attr) => ({
          attributeId: new Types.ObjectId(attr.attributeId),
          attributeName: attr.attributeName,
          valueId: new Types.ObjectId(attr.valueId),
          value: attr.value,
          colorHex: attr.colorHex,
        })),
        price: v.price,
        salePrice: v.salePrice,
        stock: v.stock ?? 0,
        images: v.images || [],
        isActive: v.isActive ?? true,
      }));
      // Compute total stock from variants
      totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }

    // Process product attributes
    const productAttributes = (dto.productAttributes || []).map((pa) => ({
      attributeId: new Types.ObjectId(pa.attributeId),
      selectedValues: pa.selectedValues.map((v) => new Types.ObjectId(v)),
    }));

    const product = await this.productModel.create({
      ...dto,
      storeId: new Types.ObjectId(storeId),
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
      subcategoryId: dto.subcategoryId
        ? new Types.ObjectId(dto.subcategoryId)
        : undefined,
      images: images || [],
      hasVariants,
      productAttributes,
      variants,
      totalStock,
    });

    // Update category stats if product has variants
    if (product.hasVariants && product.variants?.length > 0) {
      await this.categoryStatsService.updateStatsForProduct(product, 'increment');
    }

    return product.toObject();
  }

  /**
   * Update a product
   */
  async update(
    productId: string,
    storeId: string,
    dto: UpdateProductDto,
    newImageUrls?: string[],
  ) {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Handle images: combine existing images (that user wants to keep) with new uploads
    const existingImages = dto.existingImages || [];
    const newImages = newImageUrls || [];
    const combinedImages = [...existingImages, ...newImages];

    // Remove fields that need special handling
    const { existingImages: _, productAttributes, variants, ...updateData } = dto;

    // Update basic fields
    Object.assign(product, updateData);

    // Update images if any changes
    if (combinedImages.length > 0 || dto.existingImages !== undefined) {
      product.images = combinedImages;
    }

    if (dto.categoryId) {
      product.categoryId = new Types.ObjectId(dto.categoryId);
    }
    if (dto.subcategoryId) {
      product.subcategoryId = new Types.ObjectId(dto.subcategoryId);
    }

    // Handle product attributes update
    if (productAttributes !== undefined) {
      product.productAttributes = productAttributes.map((pa) => ({
        attributeId: new Types.ObjectId(pa.attributeId),
        selectedValues: pa.selectedValues.map((v) => new Types.ObjectId(v)),
      }));
    }

    // Handle variants update
    if (variants !== undefined) {
      product.hasVariants = variants.length > 0;
      product.variants = variants.map((v) => ({
        _id: v._id ? new Types.ObjectId(v._id) : new Types.ObjectId(),
        sku: v.sku,
        attributes: v.attributes.map((attr) => ({
          attributeId: new Types.ObjectId(attr.attributeId),
          attributeName: attr.attributeName,
          valueId: new Types.ObjectId(attr.valueId),
          value: attr.value,
          colorHex: attr.colorHex,
        })),
        price: v.price,
        salePrice: v.salePrice,
        stock: v.stock ?? 0,
        images: v.images || [],
        isActive: v.isActive ?? true,
      }));
      // Recompute total stock
      product.totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    } else if (dto.hasVariants === false) {
      // Switching from variants to no variants
      product.hasVariants = false;
      product.variants = [];
      product.totalStock = product.stock;
    }

    await product.save();
    return product.toObject();
  }

  /**
   * Delete a product
   */
  async delete(productId: string, storeId: string) {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Decrement category stats before deletion
    if (product.hasVariants && product.variants?.length > 0) {
      await this.categoryStatsService.updateStatsForProduct(product, 'decrement');
    }

    await this.productModel.deleteOne({ _id: product._id });

    return { deleted: true };
  }

  /**
   * Get products for a store (simple list for dashboard)
   */
  async findByStore(storeId: string) {
    return this.productModel
      .find({ storeId: new Types.ObjectId(storeId) })
      .sort({ createdAt: -1 })
      .populate('categoryId', 'name nameLocalized slug')
      .populate('subcategoryId', 'name nameLocalized slug')
      .lean();
  }

  /**
   * Get homepage products for a store with specified ordering
   * Returns up to `limit` products with some randomness for 'popular' order
   */
  async getHomepageProducts(
    storeId: string,
    order: string = 'popular',
    limit: number = 6,
  ) {
    const filter = {
      storeId: new Types.ObjectId(storeId),
      isActive: true,
    };

    let products;

    switch (order) {
      case 'newest':
        products = await this.productModel
          .find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
        break;

      case 'price_asc':
        products = await this.productModel
          .find(filter)
          .sort({ price: 1 })
          .limit(limit)
          .lean();
        break;

      case 'price_desc':
        products = await this.productModel
          .find(filter)
          .sort({ price: -1 })
          .limit(limit)
          .lean();
        break;

      case 'random':
        // Use aggregation with $sample for true randomness
        products = await this.productModel.aggregate([
          { $match: filter },
          { $sample: { size: limit } },
        ]);
        break;

      case 'popular':
      default:
        // Get more products than needed, then shuffle top ones for minor randomness
        const topProducts = await this.productModel
          .find(filter)
          .sort({ viewCount: -1, orderCount: -1 })
          .limit(limit * 2) // Get extra for shuffling
          .lean();

        // Shuffle the top products slightly for variety
        if (topProducts.length > limit) {
          // Fisher-Yates partial shuffle - only shuffle top portion
          for (let i = Math.min(topProducts.length - 1, limit + 2); i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [topProducts[i], topProducts[j]] = [topProducts[j], topProducts[i]];
          }
        }
        products = topProducts.slice(0, limit);
        break;
    }

    // Get total count for "See All" button logic
    const totalCount = await this.productModel.countDocuments(filter);

    return {
      products,
      totalCount,
      hasMore: totalCount > limit,
    };
  }

  // --- Variant Methods ---

  /**
   * Get variants for a product
   */
  async getVariants(productId: string, storeId?: string) {
    const product = await this.findById(productId, storeId);
    return product.variants || [];
  }

  /**
   * Update a single variant
   */
  async updateVariant(
    productId: string,
    variantId: string,
    storeId: string,
    dto: UpdateVariantDto,
  ) {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variantIndex = product.variants.findIndex(
      (v) => v._id.toString() === variantId,
    );

    if (variantIndex === -1) {
      throw new NotFoundException('Variant not found');
    }

    // Update variant fields
    const variant = product.variants[variantIndex];
    if (dto.sku !== undefined) variant.sku = dto.sku;
    if (dto.price !== undefined) variant.price = dto.price;
    if (dto.salePrice !== undefined) variant.salePrice = dto.salePrice;
    if (dto.stock !== undefined) variant.stock = dto.stock;
    if (dto.images !== undefined) variant.images = dto.images;
    if (dto.isActive !== undefined) variant.isActive = dto.isActive;

    // Recompute total stock
    product.totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);

    await product.save();
    return product.toObject();
  }

  /**
   * Delete a variant
   */
  async deleteVariant(productId: string, variantId: string, storeId: string) {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variantIndex = product.variants.findIndex(
      (v) => v._id.toString() === variantId,
    );

    if (variantIndex === -1) {
      throw new NotFoundException('Variant not found');
    }

    product.variants.splice(variantIndex, 1);

    // If no more variants, update hasVariants flag
    if (product.variants.length === 0) {
      product.hasVariants = false;
    }

    // Recompute total stock
    product.totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);

    await product.save();
    return { deleted: true };
  }

  /**
   * Generate variants from product attributes
   * Creates all possible combinations of selected attribute values
   */
  async generateVariants(productId: string, storeId: string) {
    const product = await this.productModel.findOne({
      _id: new Types.ObjectId(productId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.productAttributes || product.productAttributes.length === 0) {
      throw new BadRequestException('Product has no attributes configured');
    }

    // Fetch attribute details
    const attributeIds = product.productAttributes.map((pa) => pa.attributeId);
    const attributes = await this.attributeModel
      .find({ _id: { $in: attributeIds } })
      .lean();

    // Create a map for quick lookup
    const attributeMap = new Map(attributes.map((a) => [a._id.toString(), a]));

    // Build value arrays for each attribute
    const valueArrays: {
      attributeId: Types.ObjectId;
      attributeName: string;
      values: { valueId: Types.ObjectId; value: string; colorHex?: string }[];
    }[] = [];

    for (const pa of product.productAttributes) {
      const attr = attributeMap.get(pa.attributeId.toString());
      if (!attr) continue;

      const values = attr.values
        .filter((v) =>
          pa.selectedValues.some((sv) => sv.toString() === v._id.toString()),
        )
        .map((v) => ({
          valueId: v._id,
          value: v.value,
          colorHex: v.colorHex,
        }));

      if (values.length > 0) {
        valueArrays.push({
          attributeId: pa.attributeId,
          attributeName: attr.name,
          values,
        });
      }
    }

    if (valueArrays.length === 0) {
      throw new BadRequestException('No valid attribute values selected');
    }

    // Generate all combinations (Cartesian product)
    const combinations = this.cartesianProduct(
      valueArrays.map((va) => va.values),
    );

    // Create variants from combinations
    const newVariants = combinations.map((combo) => {
      const variantAttributes = combo.map((value, index) => ({
        attributeId: valueArrays[index].attributeId,
        attributeName: valueArrays[index].attributeName,
        valueId: value.valueId,
        value: value.value,
        colorHex: value.colorHex,
      }));

      // Check if this variant already exists (same attribute values)
      const existingVariant = product.variants.find((v) =>
        v.attributes.every((attr, i) =>
          attr.valueId.toString() === variantAttributes[i]?.valueId.toString(),
        ),
      );

      if (existingVariant) {
        // Keep existing variant data
        return existingVariant;
      }

      // Create new variant
      return {
        _id: new Types.ObjectId(),
        sku: undefined,
        attributes: variantAttributes,
        stock: 0,
        images: [],
        isActive: true,
      };
    });

    product.variants = newVariants;
    product.hasVariants = true;
    product.totalStock = newVariants.reduce((sum, v) => sum + (v.stock || 0), 0);

    await product.save();
    return product.toObject();
  }

  /**
   * Helper: Cartesian product of arrays
   */
  private cartesianProduct<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map((item) => [item]);

    return arrays.reduce<T[][]>(
      (acc, curr) =>
        acc.flatMap((a) => curr.map((c) => [...a, c])),
      [[]],
    );
  }

  /**
   * Bulk update variants for a product
   */
  async bulkUpdateVariants(
    productId: string,
    storeId: string,
    dto: BulkVariantsDto,
  ) {
    if (dto.regenerate) {
      return this.generateVariants(productId, storeId);
    }

    if (dto.variants) {
      const product = await this.productModel.findOne({
        _id: new Types.ObjectId(productId),
        storeId: new Types.ObjectId(storeId),
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      product.variants = dto.variants.map((v) => ({
        _id: v._id ? new Types.ObjectId(v._id) : new Types.ObjectId(),
        sku: v.sku,
        attributes: v.attributes.map((attr) => ({
          attributeId: new Types.ObjectId(attr.attributeId),
          attributeName: attr.attributeName,
          valueId: new Types.ObjectId(attr.valueId),
          value: attr.value,
          colorHex: attr.colorHex,
        })),
        price: v.price,
        salePrice: v.salePrice,
        stock: v.stock ?? 0,
        images: v.images || [],
        isActive: v.isActive ?? true,
      }));

      product.hasVariants = product.variants.length > 0;
      product.totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);

      await product.save();
      return product.toObject();
    }

    throw new BadRequestException('Either regenerate or variants must be provided');
  }
}

