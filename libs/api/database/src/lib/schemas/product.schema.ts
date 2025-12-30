import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

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
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes (compound indexes cover storeId queries via prefix)
ProductSchema.index({ storeId: 1, isActive: 1 });
ProductSchema.index({ storeId: 1, categoryId: 1 });
ProductSchema.index({ storeId: 1, subcategoryId: 1 });
ProductSchema.index({ storeId: 1, isOnSale: 1 });
ProductSchema.index({ name: 'text', description: 'text' }); // Full-text search
