import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryAttributeStatsDocument =
  HydratedDocument<CategoryAttributeStats>;

/**
 * Tracks the count of products for each attribute value within a category.
 * This enables efficient faceted filtering on category pages without
 * having to query all products.
 */

@Schema({ _id: false })
export class CategoryAttributeValueStat {
  @Prop({ type: Types.ObjectId, required: true })
  valueId!: Types.ObjectId;

  @Prop({ required: true })
  value!: string; // Denormalized for display

  @Prop()
  valueSlug?: string;

  @Prop()
  colorHex?: string; // For color-type attributes

  @Prop({ default: 0, min: 0 })
  count!: number; // Number of in-stock products with this value
}

export const CategoryAttributeValueStatSchema = SchemaFactory.createForClass(
  CategoryAttributeValueStat,
);

@Schema({ timestamps: true, collection: 'category_attribute_stats' })
export class CategoryAttributeStats {
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId!: Types.ObjectId; // Can be main category or subcategory

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Attribute', required: true })
  attributeId!: Types.ObjectId;

  @Prop({ required: true })
  attributeName!: string; // Denormalized

  @Prop({ required: true })
  attributeSlug!: string; // Denormalized

  @Prop({ type: String, enum: ['text', 'color'], default: 'text' })
  attributeType!: 'text' | 'color';

  @Prop({ type: [CategoryAttributeValueStatSchema], default: [] })
  values!: CategoryAttributeValueStat[];

  @Prop({ default: 0, min: 0 })
  totalProducts!: number; // Total products with any value of this attribute in category
}

export const CategoryAttributeStatsSchema = SchemaFactory.createForClass(
  CategoryAttributeStats,
);

// Indexes
CategoryAttributeStatsSchema.index(
  { categoryId: 1, storeId: 1, attributeId: 1 },
  { unique: true },
);
CategoryAttributeStatsSchema.index({ storeId: 1, attributeId: 1 });
CategoryAttributeStatsSchema.index({ categoryId: 1, storeId: 1 });


