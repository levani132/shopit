import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AttributeDocument = HydratedDocument<Attribute>;
export type AttributeValueDocument = HydratedDocument<AttributeValue>;

/**
 * Bilingual text field - supports Georgian (ka) and English (en)
 */
export class BilingualText {
  @Prop({ trim: true })
  ka?: string; // Georgian

  @Prop({ trim: true })
  en?: string; // English
}

/**
 * Attribute Value - individual option for an attribute
 * e.g., "XL" for Size, "Red" for Color
 */
@Schema({ _id: true })
export class AttributeValue {
  _id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  value!: string; // Default/fallback value

  @Prop({ type: Object })
  valueLocalized?: BilingualText; // Localized values

  @Prop({ required: true, lowercase: true, trim: true })
  slug!: string; // URL-friendly slug

  @Prop({ trim: true })
  colorHex?: string; // Only for color type, e.g., "#FF0000"

  @Prop({ default: 0 })
  order!: number; // Display order
}

export const AttributeValueSchema = SchemaFactory.createForClass(AttributeValue);

/**
 * Attribute - a customizable product property
 * e.g., "Size", "Color", "Material", "Gender"
 * 
 * Types:
 * - text: Standard text values (Size, Material, Gender)
 * - color: Color with hex code for visual display
 */
@Schema({ timestamps: true, collection: 'attributes' })
export class Attribute {
  @Prop({ required: true, trim: true })
  name!: string; // Default/fallback name (usually English)

  @Prop({ type: Object })
  nameLocalized?: BilingualText; // Localized names

  @Prop({ required: true, lowercase: true, trim: true })
  slug!: string; // URL-friendly slug

  @Prop({ required: true, enum: ['text', 'color'], default: 'text' })
  type!: 'text' | 'color';

  @Prop({ default: false })
  requiresImage!: boolean; // If true, each value needs a product image

  @Prop({ type: [AttributeValueSchema], default: [] })
  values!: AttributeValue[];

  @Prop({ default: 0 })
  order!: number; // Display order in filters

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId!: Types.ObjectId;
}

export const AttributeSchema = SchemaFactory.createForClass(Attribute);

// Indexes
AttributeSchema.index({ storeId: 1, slug: 1 }, { unique: true });
AttributeSchema.index({ storeId: 1, order: 1 });
AttributeSchema.index({ storeId: 1, isActive: 1 });

