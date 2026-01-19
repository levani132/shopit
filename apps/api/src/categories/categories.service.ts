import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Category,
  CategoryDocument,
  Subcategory,
  SubcategoryDocument,
} from '@shopit/api-database';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubcategoryDto,
  UpdateSubcategoryDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Subcategory.name) private subcategoryModel: Model<SubcategoryDocument>,
  ) {}

  /**
   * Generate a slug from a name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u10D0-\u10FF]+/g, '-') // Allow Georgian chars
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  }

  /**
   * Get all categories for a store with their subcategories
   */
  async findAllByStore(storeId: string) {
    const categories = await this.categoryModel
      .find({ storeId: new Types.ObjectId(storeId) })
      .sort({ order: 1 })
      .lean();

    // Get subcategories for each category
    const categoriesWithSubs = await Promise.all(
      categories.map(async (cat) => {
        const subcategories = await this.subcategoryModel
          .find({ categoryId: cat._id })
          .sort({ order: 1 })
          .lean();
        return {
          ...cat,
          subcategories,
        };
      }),
    );

    return categoriesWithSubs;
  }

  /**
   * Get a single category by ID
   */
  async findById(categoryId: string) {
    const category = await this.categoryModel.findById(categoryId).lean();
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const subcategories = await this.subcategoryModel
      .find({ categoryId: category._id })
      .sort({ order: 1 })
      .lean();

    return { ...category, subcategories };
  }

  /**
   * Create a new category
   */
  async create(storeId: string, dto: CreateCategoryDto) {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug in same store
    const existing = await this.categoryModel.findOne({
      storeId: new Types.ObjectId(storeId),
      slug,
    });
    if (existing) {
      throw new ConflictException('A category with this slug already exists');
    }

    // Get max order for this store
    const maxOrder = await this.categoryModel
      .findOne({ storeId: new Types.ObjectId(storeId) })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const category = await this.categoryModel.create({
      ...dto,
      slug,
      storeId: new Types.ObjectId(storeId),
      order: dto.order ?? (maxOrder?.order ?? -1) + 1,
    });

    return { ...category.toObject(), subcategories: [] };
  }

  /**
   * Update a category
   */
  async update(categoryId: string, storeId: string, dto: UpdateCategoryDto) {
    const category = await this.categoryModel.findOne({
      _id: new Types.ObjectId(categoryId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check for slug conflict if slug is being changed
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryModel.findOne({
        storeId: new Types.ObjectId(storeId),
        slug: dto.slug,
        _id: { $ne: category._id },
      });
      if (existing) {
        throw new ConflictException('A category with this slug already exists');
      }
    }

    Object.assign(category, dto);
    await category.save();

    const subcategories = await this.subcategoryModel
      .find({ categoryId: category._id })
      .sort({ order: 1 })
      .lean();

    return { ...category.toObject(), subcategories };
  }

  /**
   * Delete a category and its subcategories
   */
  async delete(categoryId: string, storeId: string) {
    const category = await this.categoryModel.findOneAndDelete({
      _id: new Types.ObjectId(categoryId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Delete all subcategories
    await this.subcategoryModel.deleteMany({ categoryId: category._id });

    return { deleted: true };
  }

  /**
   * Reorder categories
   */
  async reorder(storeId: string, categoryIds: string[]) {
    const bulkOps = categoryIds.map((id, index) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(id),
          storeId: new Types.ObjectId(storeId),
        },
        update: { $set: { order: index } },
      },
    }));

    await this.categoryModel.bulkWrite(bulkOps);
    return this.findAllByStore(storeId);
  }

  // --- Subcategory methods ---

  /**
   * Create a subcategory
   */
  async createSubcategory(storeId: string, dto: CreateSubcategoryDto) {
    // Verify category belongs to store
    const category = await this.categoryModel.findOne({
      _id: new Types.ObjectId(dto.categoryId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug in same category
    const existing = await this.subcategoryModel.findOne({
      categoryId: category._id,
      slug,
    });
    if (existing) {
      throw new ConflictException('A subcategory with this slug already exists');
    }

    // Get max order
    const maxOrder = await this.subcategoryModel
      .findOne({ categoryId: category._id })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const subcategory = await this.subcategoryModel.create({
      name: dto.name,
      nameLocalized: dto.nameLocalized,
      slug,
      categoryId: category._id,
      order: dto.order ?? (maxOrder?.order ?? -1) + 1,
    });

    return subcategory.toObject();
  }

  /**
   * Update a subcategory
   */
  async updateSubcategory(
    subcategoryId: string,
    storeId: string,
    dto: UpdateSubcategoryDto,
  ) {
    const subcategory = await this.subcategoryModel.findById(subcategoryId);
    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    // Verify parent category belongs to store
    const category = await this.categoryModel.findOne({
      _id: subcategory.categoryId,
      storeId: new Types.ObjectId(storeId),
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check for slug conflict
    if (dto.slug && dto.slug !== subcategory.slug) {
      const existing = await this.subcategoryModel.findOne({
        categoryId: subcategory.categoryId,
        slug: dto.slug,
        _id: { $ne: subcategory._id },
      });
      if (existing) {
        throw new ConflictException('A subcategory with this slug already exists');
      }
    }

    Object.assign(subcategory, dto);
    await subcategory.save();

    return subcategory.toObject();
  }

  /**
   * Delete a subcategory
   */
  async deleteSubcategory(subcategoryId: string, storeId: string) {
    const subcategory = await this.subcategoryModel.findById(subcategoryId);
    if (!subcategory) {
      throw new NotFoundException('Subcategory not found');
    }

    // Verify parent category belongs to store
    const category = await this.categoryModel.findOne({
      _id: subcategory.categoryId,
      storeId: new Types.ObjectId(storeId),
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await subcategory.deleteOne();
    return { deleted: true };
  }
}

