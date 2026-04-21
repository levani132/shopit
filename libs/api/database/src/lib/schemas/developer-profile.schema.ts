import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BilingualText } from './store.schema';

export type DeveloperProfileDocument = HydratedDocument<DeveloperProfile>;

@Schema({ _id: false })
export class DeveloperEarnings {
  @Prop({ default: 0, min: 0 })
  total!: number;

  @Prop({ default: 0, min: 0 })
  pending!: number;

  @Prop({ default: 0, min: 0 })
  withdrawn!: number;
}

@Schema({ _id: false })
export class DeveloperBankDetails {
  @Prop({ required: true, trim: true })
  accountName!: string;

  @Prop({ required: true, trim: true })
  iban!: string;

  @Prop({ required: true, trim: true })
  bankName!: string;
}

@Schema({ timestamps: true, collection: 'developer_profiles' })
export class DeveloperProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ type: Object })
  bio?: BilingualText;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  githubUsername?: string;

  @Prop({ trim: true, select: false })
  githubAccessToken?: string;

  @Prop({ trim: true })
  avatar?: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'suspended'],
    default: 'pending',
  })
  status!: 'pending' | 'approved' | 'suspended';

  @Prop({ type: Object, default: { total: 0, pending: 0, withdrawn: 0 } })
  earnings!: DeveloperEarnings;

  @Prop({ type: Object })
  bankDetails?: DeveloperBankDetails;

  @Prop({ default: 0, min: 0 })
  templatesCount!: number;
}

export const DeveloperProfileSchema =
  SchemaFactory.createForClass(DeveloperProfile);

// Indexes
DeveloperProfileSchema.index({ userId: 1 }, { unique: true });
DeveloperProfileSchema.index({ status: 1 });
DeveloperProfileSchema.index({ displayName: 'text' });
