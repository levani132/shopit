import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CategoryAttributeStats,
  CategoryAttributeStatsDocument,
  Attribute,
  AttributeDocument,
  Product,
  ProductDocument,
} from '@sellit/api-database';

interface VariantAttributeInfo {
  attributeId: string;
  valueId: string;
  value: string;
  colorHex?: string;
}

@Injectable()
export class CategoryStatsService {
  private readonly logger = new Logger(CategoryStatsService.name);

  constructor(
    @InjectModel(CategoryAttributeStats.name)
    private statsModel: Model<CategoryAttributeStatsDocument>,
    @InjectModel(Attribute.name)
    private attributeModel: Model<AttributeDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  /**
   * Update stats when a product is created or updated with variants
   */
  async updateStatsForProduct(
    product: ProductDocument,
    operation: 'increment' | 'decrement',
  ): Promise<void> {
    if (!product.hasVariants || !product.variants?.length) {
      return;
    }

    const delta = operation === 'increment' ? 1 : -1;

    // Get unique attribute/value combinations from variants
    const seenCombinations = new Set<string>();
    const attributeValues: VariantAttributeInfo[] = [];

    for (const variant of product.variants) {
      // Only count variants that are active and have stock
      if (!variant.isActive || variant.stock <= 0) continue;

      for (const attr of variant.attributes) {
        const key = `${attr.attributeId}-${attr.valueId}`;
        if (!seenCombinations.has(key)) {
          seenCombinations.add(key);
          attributeValues.push({
            attributeId: attr.attributeId.toString(),
            valueId: attr.valueId.toString(),
            value: attr.value,
            colorHex: attr.colorHex,
          });
        }
      }
    }

    if (attributeValues.length === 0) return;

    // Get attribute details for slugs and types
    const attributeIds = [...new Set(attributeValues.map((av) => av.attributeId))];
    const attributes = await this.attributeModel
      .find({ _id: { $in: attributeIds.map((id) => new Types.ObjectId(id)) } })
      .lean();

    const attributeMap = new Map(
      attributes.map((a) => [a._id.toString(), a]),
    );

    // Update stats for categoryId (if exists)
    const categoryIds: Types.ObjectId[] = [];
    if (product.categoryId) {
      categoryIds.push(product.categoryId);
    }
    if (product.subcategoryId) {
      categoryIds.push(product.subcategoryId);
    }

    for (const categoryId of categoryIds) {
      for (const av of attributeValues) {
        const attr = attributeMap.get(av.attributeId);
        if (!attr) continue;

        const attrValue = attr.values.find(
          (v) => v._id.toString() === av.valueId,
        );

        await this.updateStat(
          categoryId,
          product.storeId,
          attr,
          {
            valueId: new Types.ObjectId(av.valueId),
            value: av.value,
            valueSlug: attrValue?.slug || '',
            colorHex: av.colorHex,
          },
          delta,
        );
      }
    }
  }

  /**
   * Core update method for a single stat entry
   */
  private async updateStat(
    categoryId: Types.ObjectId,
    storeId: Types.ObjectId,
    attribute: AttributeDocument | Attribute,
    valueInfo: {
      valueId: Types.ObjectId;
      value: string;
      valueSlug: string;
      colorHex?: string;
    },
    delta: number,
  ): Promise<void> {
    try {
      // Try to update existing value
      const result = await this.statsModel.updateOne(
        {
          categoryId,
          storeId,
          attributeId: attribute._id,
          'values.valueId': valueInfo.valueId,
        },
        {
          $inc: {
            'values.$.count': delta,
            totalProducts: delta,
          },
          $set: {
            attributeName: attribute.name,
            attributeSlug: attribute.slug,
            attributeType: attribute.type,
          },
        },
      );

      if (result.matchedCount === 0) {
        // Value doesn't exist, need to upsert the whole document
        await this.statsModel.updateOne(
          {
            categoryId,
            storeId,
            attributeId: attribute._id,
          },
          {
            $setOnInsert: {
              attributeName: attribute.name,
              attributeSlug: attribute.slug,
              attributeType: attribute.type,
            },
            $inc: { totalProducts: delta },
            $push: {
              values: {
                valueId: valueInfo.valueId,
                value: valueInfo.value,
                valueSlug: valueInfo.valueSlug,
                colorHex: valueInfo.colorHex,
                count: Math.max(0, delta),
              },
            },
          },
          { upsert: true },
        );
      }

      // Clean up: remove values with count <= 0
      await this.statsModel.updateOne(
        { categoryId, storeId, attributeId: attribute._id },
        { $pull: { values: { count: { $lte: 0 } } } },
      );

      // Clean up: remove documents with no values and totalProducts <= 0
      await this.statsModel.deleteOne({
        categoryId,
        storeId,
        attributeId: attribute._id,
        totalProducts: { $lte: 0 },
        'values.0': { $exists: false },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update stat for category ${categoryId}, attribute ${attribute._id}`,
        error,
      );
    }
  }

  /**
   * Get all filter stats for a category
   */
  async getFiltersForCategory(
    categoryId: string,
    storeId: string,
  ): Promise<CategoryAttributeStatsDocument[]> {
    return this.statsModel
      .find({
        categoryId: new Types.ObjectId(categoryId),
        storeId: new Types.ObjectId(storeId),
        totalProducts: { $gt: 0 },
      })
      .sort({ attributeName: 1 })
      .lean();
  }

  /**
   * Rebuild stats for a category from scratch
   * Useful for data migration or fixing inconsistencies
   */
  async rebuildStatsForCategory(
    categoryId: string,
    storeId: string,
  ): Promise<void> {
    this.logger.log(`Rebuilding stats for category ${categoryId}`);

    // Delete existing stats for this category
    await this.statsModel.deleteMany({
      categoryId: new Types.ObjectId(categoryId),
      storeId: new Types.ObjectId(storeId),
    });

    // Find all active products with variants in this category
    const products = await this.productModel
      .find({
        storeId: new Types.ObjectId(storeId),
        $or: [
          { categoryId: new Types.ObjectId(categoryId) },
          { subcategoryId: new Types.ObjectId(categoryId) },
        ],
        hasVariants: true,
        isActive: true,
      })
      .lean();

    // Rebuild stats for each product
    for (const product of products) {
      await this.updateStatsForProduct(product as ProductDocument, 'increment');
    }

    this.logger.log(
      `Rebuilt stats for category ${categoryId}: processed ${products.length} products`,
    );
  }

  /**
   * Rebuild all stats for a store
   */
  async rebuildStatsForStore(storeId: string): Promise<void> {
    this.logger.log(`Rebuilding all stats for store ${storeId}`);

    // Delete all stats for this store
    await this.statsModel.deleteMany({
      storeId: new Types.ObjectId(storeId),
    });

    // Find all active products with variants
    const products = await this.productModel
      .find({
        storeId: new Types.ObjectId(storeId),
        hasVariants: true,
        isActive: true,
      })
      .lean();

    // Rebuild stats for each product
    for (const product of products) {
      await this.updateStatsForProduct(product as ProductDocument, 'increment');
    }

    this.logger.log(
      `Rebuilt all stats for store ${storeId}: processed ${products.length} products`,
    );
  }
}

