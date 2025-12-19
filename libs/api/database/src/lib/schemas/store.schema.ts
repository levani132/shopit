import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StoreDocument = HydratedDocument<Store>;

@Schema({ timestamps: true, collection: 'stores' })
export class Store {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  subdomain: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  coverImage?: string;

  @Prop()
  profileImage?: string;

  @Prop({ default: '#6366f1' })
  accentColor: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;
}

export const StoreSchema = SchemaFactory.createForClass(Store);

// Indexes
StoreSchema.index({ ownerId: 1 });
StoreSchema.index({ isActive: 1 });
