import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TemplateReviewDocument = HydratedDocument<TemplateReview>;

@Schema({ timestamps: true, collection: 'template_reviews' })
export class TemplateReview {
  @Prop({
    type: Types.ObjectId,
    ref: 'TemplateMarketplaceListing',
    required: true,
  })
  listingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sellerId!: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  body!: string;
}

export const TemplateReviewSchema =
  SchemaFactory.createForClass(TemplateReview);

// Indexes
TemplateReviewSchema.index({ listingId: 1 });
TemplateReviewSchema.index({ sellerId: 1 });
TemplateReviewSchema.index({ listingId: 1, sellerId: 1 }, { unique: true });
TemplateReviewSchema.index({ rating: 1 });
