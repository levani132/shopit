import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DeveloperPayoutDocument = HydratedDocument<DeveloperPayout>;

@Schema({ _id: false })
export class PayoutBreakdownItem {
  @Prop({ type: Types.ObjectId, ref: 'TemplatePurchase', required: true })
  purchaseId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, enum: ['monthly', 'one_time'], required: true })
  type!: 'monthly' | 'one_time';
}

@Schema({ timestamps: true, collection: 'developer_payouts' })
export class DeveloperPayout {
  @Prop({ type: Types.ObjectId, ref: 'DeveloperProfile', required: true })
  developerId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, min: 0 })
  platformFee!: number;

  @Prop({ required: true, min: 0 })
  netAmount!: number;

  @Prop({
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Prop({ required: true })
  periodStart!: Date;

  @Prop({ required: true })
  periodEnd!: Date;

  @Prop({ type: [Object], default: [] })
  breakdown!: PayoutBreakdownItem[];

  @Prop()
  bogDocumentId?: string;
}

export const DeveloperPayoutSchema =
  SchemaFactory.createForClass(DeveloperPayout);

// Indexes
DeveloperPayoutSchema.index({ developerId: 1 });
DeveloperPayoutSchema.index({ status: 1 });
DeveloperPayoutSchema.index({ periodStart: 1, periodEnd: 1 });
