import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attribute, AttributeDocument } from '@sellit/api-database';
import {
  CreateAttributeDto,
  UpdateAttributeDto,
  AddAttributeValueDto,
  UpdateAttributeValueDto,
} from './dto/attribute.dto';

@Injectable()
export class AttributesService {
  constructor(
    @InjectModel(Attribute.name)
    private attributeModel: Model<AttributeDocument>,
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
   * Get all attributes for a store
   */
  async findAllByStore(storeId: string, includeInactive = false) {
    const filter: Record<string, unknown> = {
      storeId: new Types.ObjectId(storeId),
    };
    if (!includeInactive) {
      filter.isActive = true;
    }

    return this.attributeModel.find(filter).sort({ order: 1 }).lean();
  }

  /**
   * Get a single attribute by ID
   */
  async findById(attributeId: string, storeId?: string) {
    const filter: Record<string, unknown> = {
      _id: new Types.ObjectId(attributeId),
    };
    if (storeId) {
      filter.storeId = new Types.ObjectId(storeId);
    }

    const attribute = await this.attributeModel.findOne(filter).lean();
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    return attribute;
  }

  /**
   * Create a new attribute
   */
  async create(storeId: string, dto: CreateAttributeDto) {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug in same store
    const existing = await this.attributeModel.findOne({
      storeId: new Types.ObjectId(storeId),
      slug,
    });
    if (existing) {
      throw new ConflictException('An attribute with this slug already exists');
    }

    // Get max order for this store
    const maxOrder = await this.attributeModel
      .findOne({ storeId: new Types.ObjectId(storeId) })
      .sort({ order: -1 })
      .select('order')
      .lean();

    // Process values if provided
    const values = (dto.values || []).map((v, index) => ({
      _id: new Types.ObjectId(),
      value: v.value,
      valueLocalized: v.valueLocalized,
      slug: v.slug || this.generateSlug(v.value),
      colorHex: dto.type === 'color' ? v.colorHex : undefined,
      order: v.order ?? index,
    }));

    // Validate color values if type is color
    if (dto.type === 'color') {
      for (const v of values) {
        if (!v.colorHex) {
          throw new BadRequestException(
            `Color hex is required for color-type attributes. Missing for value: ${v.value}`,
          );
        }
      }
    }

    const attribute = await this.attributeModel.create({
      name: dto.name,
      nameLocalized: dto.nameLocalized,
      slug,
      type: dto.type,
      requiresImage: dto.requiresImage ?? false,
      values,
      order: dto.order ?? (maxOrder?.order ?? -1) + 1,
      isActive: true,
      storeId: new Types.ObjectId(storeId),
    });

    return attribute.toObject();
  }

  /**
   * Update an attribute
   */
  async update(attributeId: string, storeId: string, dto: UpdateAttributeDto) {
    const attribute = await this.attributeModel.findOne({
      _id: new Types.ObjectId(attributeId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    // Check for slug conflict if slug is being changed
    if (dto.slug && dto.slug !== attribute.slug) {
      const existing = await this.attributeModel.findOne({
        storeId: new Types.ObjectId(storeId),
        slug: dto.slug,
        _id: { $ne: attribute._id },
      });
      if (existing) {
        throw new ConflictException('An attribute with this slug already exists');
      }
    }

    // Don't allow changing type if values exist
    if (dto.type && dto.type !== attribute.type && attribute.values.length > 0) {
      throw new BadRequestException(
        'Cannot change attribute type when values exist. Delete all values first.',
      );
    }

    Object.assign(attribute, dto);
    await attribute.save();

    return attribute.toObject();
  }

  /**
   * Delete an attribute
   */
  async delete(attributeId: string, storeId: string) {
    const attribute = await this.attributeModel.findOneAndDelete({
      _id: new Types.ObjectId(attributeId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    // TODO: Also clean up products that use this attribute
    // This should be handled carefully - perhaps just mark as inactive instead

    return { deleted: true };
  }

  /**
   * Reorder attributes
   */
  async reorder(storeId: string, attributeIds: string[]) {
    const bulkOps = attributeIds.map((id, index) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(id),
          storeId: new Types.ObjectId(storeId),
        },
        update: { $set: { order: index } },
      },
    }));

    await this.attributeModel.bulkWrite(bulkOps);
    return this.findAllByStore(storeId, true);
  }

  // --- Attribute Value methods ---

  /**
   * Add a value to an attribute
   */
  async addValue(attributeId: string, storeId: string, dto: AddAttributeValueDto) {
    const attribute = await this.attributeModel.findOne({
      _id: new Types.ObjectId(attributeId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    const slug = dto.slug || this.generateSlug(dto.value);

    // Check for duplicate slug in same attribute
    const existingValue = attribute.values.find((v) => v.slug === slug);
    if (existingValue) {
      throw new ConflictException('A value with this slug already exists');
    }

    // Validate color hex if attribute is color type
    if (attribute.type === 'color' && !dto.colorHex) {
      throw new BadRequestException('Color hex is required for color-type attributes');
    }

    // Get max order
    const maxOrder = attribute.values.reduce((max, v) => Math.max(max, v.order), -1);

    const newValue = {
      _id: new Types.ObjectId(),
      value: dto.value,
      valueLocalized: dto.valueLocalized,
      slug,
      colorHex: attribute.type === 'color' ? dto.colorHex : undefined,
      order: dto.order ?? maxOrder + 1,
    };

    attribute.values.push(newValue);
    await attribute.save();

    return attribute.toObject();
  }

  /**
   * Update a value
   */
  async updateValue(
    attributeId: string,
    valueId: string,
    storeId: string,
    dto: UpdateAttributeValueDto,
  ) {
    const attribute = await this.attributeModel.findOne({
      _id: new Types.ObjectId(attributeId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    const valueIndex = attribute.values.findIndex(
      (v) => v._id.toString() === valueId,
    );
    if (valueIndex === -1) {
      throw new NotFoundException('Value not found');
    }

    const value = attribute.values[valueIndex];

    // Check for slug conflict if slug is being changed
    if (dto.slug && dto.slug !== value.slug) {
      const existingValue = attribute.values.find(
        (v) => v.slug === dto.slug && v._id.toString() !== valueId,
      );
      if (existingValue) {
        throw new ConflictException('A value with this slug already exists');
      }
    }

    // Update value fields
    if (dto.value !== undefined) value.value = dto.value;
    if (dto.valueLocalized !== undefined) value.valueLocalized = dto.valueLocalized;
    if (dto.slug !== undefined) value.slug = dto.slug;
    if (dto.order !== undefined) value.order = dto.order;
    if (attribute.type === 'color' && dto.colorHex !== undefined) {
      value.colorHex = dto.colorHex;
    }

    await attribute.save();

    return attribute.toObject();
  }

  /**
   * Delete a value
   */
  async deleteValue(attributeId: string, valueId: string, storeId: string) {
    const attribute = await this.attributeModel.findOne({
      _id: new Types.ObjectId(attributeId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    const valueIndex = attribute.values.findIndex(
      (v) => v._id.toString() === valueId,
    );
    if (valueIndex === -1) {
      throw new NotFoundException('Value not found');
    }

    attribute.values.splice(valueIndex, 1);
    await attribute.save();

    // TODO: Clean up products that use this value
    // This should be handled carefully

    return attribute.toObject();
  }

  /**
   * Reorder values within an attribute
   */
  async reorderValues(attributeId: string, storeId: string, valueIds: string[]) {
    const attribute = await this.attributeModel.findOne({
      _id: new Types.ObjectId(attributeId),
      storeId: new Types.ObjectId(storeId),
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    // Reorder values based on valueIds array
    valueIds.forEach((id, index) => {
      const value = attribute.values.find((v) => v._id.toString() === id);
      if (value) {
        value.order = index;
      }
    });

    // Sort values by order
    attribute.values.sort((a, b) => a.order - b.order);

    await attribute.save();

    return attribute.toObject();
  }
}

