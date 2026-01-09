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

  // Popularity tracking
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
