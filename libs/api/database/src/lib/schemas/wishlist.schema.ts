import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WishlistItemDocument = WishlistItem & Document;

@Schema({ timestamps: true })
export class WishlistItem {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId!: Types.ObjectId;

  // Denormalized product data for quick display
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  price!: number;

  @Prop()
  salePrice?: number;

  @Prop()
  image?: string;

  @Prop({ default: true })
  inStock!: boolean;

  // Store info for display
  @Prop()
  storeName?: string;

  @Prop()
  storeSubdomain?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

// Compound index to ensure unique product per user
WishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

