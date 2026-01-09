import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Product, ProductDocument } from '@sellit/api-database';
import {
  ListProductsDto,
  CreateProductDto,
  UpdateProductDto,
  SortBy,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

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

    // In stock filter
    if (inStock === true) {
      filter.stock = { $gt: 0 };
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
    const product = await this.productModel.create({
      ...dto,
      storeId: new Types.ObjectId(storeId),
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
      subcategoryId: dto.subcategoryId
        ? new Types.ObjectId(dto.subcategoryId)
        : undefined,
      images: images || [],
    });

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

    // Remove existingImages from dto before assigning (it's not a schema field)
    const { existingImages: _, ...updateData } = dto;

    // Update fields
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

    await product.save();
    return product.toObject();
  }

  /**
   * Delete a product
   */
  async delete(productId: string, storeId: string) {
    const result = await this.productModel.findOneAndDelete({
      _id: new Types.ObjectId(productId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!result) {
      throw new NotFoundException('Product not found');
    }

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
}

