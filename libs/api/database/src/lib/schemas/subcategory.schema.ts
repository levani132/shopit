import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubcategoryDocument = HydratedDocument<Subcategory>;

/**
 * Bilingual text field - supports Georgian (ka) and English (en)
 */
export class BilingualText {
  @Prop({ trim: true })
  ka?: string; // Georgian

  @Prop({ trim: true })
  en?: string; // English
}

@Schema({ timestamps: true, collection: 'subcategories' })
export class Subcategory {
  @Prop({ required: true, trim: true })
  name!: string; // Default/fallback name (usually English)

  @Prop({ type: Object })
  nameLocalized?: BilingualText; // Localized names

  @Prop({ required: true, lowercase: true, trim: true })
  slug!: string;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId!: Types.ObjectId;
}

export const SubcategorySchema = SchemaFactory.createForClass(Subcategory);

// Indexes
SubcategorySchema.index({ categoryId: 1 });
SubcategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });
SubcategorySchema.index({ categoryId: 1, order: 1 });
