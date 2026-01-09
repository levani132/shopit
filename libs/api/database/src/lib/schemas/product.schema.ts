import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

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
 * Selected attribute for a product
 */
@Schema({ _id: false })
export class ProductAttribute {
  @Prop({ type: Types.ObjectId, ref: 'Attribute', required: true })
  attributeId!: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], default: [] })
  selectedValues!: Types.ObjectId[]; // Which values of this attribute apply to this product
}

/**
 * Variant attribute value (denormalized for queries)
 */
@Schema({ _id: false })
export class VariantAttributeValue {
  @Prop({ type: Types.ObjectId, ref: 'Attribute', required: true })
  attributeId!: Types.ObjectId;

  @Prop({ required: true })
  attributeName!: string; // Denormalized

  @Prop({ type: Types.ObjectId, required: true })
  valueId!: Types.ObjectId;

  @Prop({ required: true })
  value!: string; // Denormalized

  @Prop()
  colorHex?: string; // For color attributes
}

/**
 * Product Variant - a specific combination of attribute values
 */
@Schema({ timestamps: true })
export class ProductVariant {
  @Prop({ type: Types.ObjectId, auto: true })
  _id!: Types.ObjectId;

  @Prop({ trim: true })
  sku?: string; // Stock keeping unit

  @Prop({ type: [Object], default: [] })
  attributes!: VariantAttributeValue[];

  @Prop({ min: 0 })
  price?: number; // Override base price

  @Prop({ min: 0 })
  salePrice?: number; // Override sale price

  @Prop({ default: 0, min: 0 })
  stock!: number;

  @Prop({ type: [String], default: [] })
  images!: string[]; // Variant-specific images

  @Prop({ default: true })
  isActive!: boolean;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Object })
  nameLocalized?: BilingualText;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Object })
  descriptionLocalized?: BilingualText;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ min: 0 })
  salePrice?: number;

  @Prop({ default: false })
  isOnSale!: boolean;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ default: 0, min: 0 })
  stock!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subcategory' })
  subcategoryId?: Types.ObjectId;

  // --- Variant Support ---
  
  @Prop({ default: false })
  hasVariants!: boolean;

  @Prop({ type: [Object], default: [] })
  productAttributes!: ProductAttribute[]; // Which attributes this product uses

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants!: ProductVariant[];

  // Total stock (sum of all variant stocks, or direct stock if no variants)
  @Prop({ default: 0, min: 0 })
  totalStock!: number;

  // --- Popularity tracking ---
  
  @Prop({ default: 0, min: 0 })
  viewCount!: number;

  @Prop({ default: 0, min: 0 })
  orderCount!: number; // For future use - track how many times product was ordered
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes
ProductSchema.index({ storeId: 1, isActive: 1 });
ProductSchema.index({ storeId: 1, categoryId: 1 });
ProductSchema.index({ storeId: 1, subcategoryId: 1 });
ProductSchema.index({ storeId: 1, isOnSale: 1 });
ProductSchema.index({ storeId: 1, price: 1 }); // For price sorting/filtering
ProductSchema.index({ storeId: 1, viewCount: -1 }); // For popularity sorting
ProductSchema.index({ name: 'text', description: 'text' }); // Full-text search

// Variant-related indexes
ProductSchema.index({ 'variants._id': 1 }); // Find product by variant ID
ProductSchema.index({ 'productAttributes.attributeId': 1 }); // Find products using an attribute
ProductSchema.index({
  'variants.attributes.attributeId': 1,
  'variants.attributes.valueId': 1,
}); // Filter by attribute values
