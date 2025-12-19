import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  slug: string;

  @Prop()
  image?: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId: Types.ObjectId;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Indexes
CategorySchema.index({ storeId: 1, slug: 1 }, { unique: true });
CategorySchema.index({ storeId: 1, order: 1 });
