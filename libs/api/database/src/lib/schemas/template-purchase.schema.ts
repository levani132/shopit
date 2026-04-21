import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TemplatePurchaseDocument = HydratedDocument<TemplatePurchase>;

@Schema({ timestamps: true, collection: 'template_purchases' })
export class TemplatePurchase {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sellerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'TemplateMarketplaceListing',
    required: true,
  })
  listingId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['free', 'monthly', 'one_time'],
    required: true,
  })
  type!: 'free' | 'monthly' | 'one_time';

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, min: 0 })
  platformFee!: number;

  @Prop({ required: true, min: 0 })
  developerShare!: number;

  @Prop({
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due'],
    default: 'active',
  })
  status!: 'active' | 'cancelled' | 'expired' | 'past_due';

  @Prop({ required: true })
  startDate!: Date;

  @Prop()
  endDate?: Date;

  @Prop()
  nextBillingDate?: Date;

  @Prop()
  bogOrderId?: string;

  @Prop()
  cancelledAt?: Date;
}

export const TemplatePurchaseSchema =
  SchemaFactory.createForClass(TemplatePurchase);

// Indexes
TemplatePurchaseSchema.index({ sellerId: 1 });
TemplatePurchaseSchema.index({ storeId: 1 });
TemplatePurchaseSchema.index({ listingId: 1 });
TemplatePurchaseSchema.index({ status: 1 });
TemplatePurchaseSchema.index({ sellerId: 1, listingId: 1 });
TemplatePurchaseSchema.index({ nextBillingDate: 1, status: 1 });
