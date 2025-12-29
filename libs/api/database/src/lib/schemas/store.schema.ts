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
  logo?: string; // Store logo URL

  @Prop()
  coverImage?: string;

  @Prop({ default: 'indigo' }) // Brand color name (e.g., 'indigo', 'rose', 'blue')
  brandColor: string;

  @Prop({ default: '#6366f1' }) // Fallback hex color
  accentColor: string;

  @Prop({ default: false })
  useInitialAsLogo: boolean; // Use colored initial instead of logo

  @Prop({ default: true })
  useDefaultCover: boolean; // Use colored gradient as cover instead of image

  @Prop({ trim: true })
  authorName?: string; // Display name for the store owner

  @Prop({ default: true })
  showAuthorName: boolean; // Show author name on store homepage

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isVerified: boolean; // Store has been verified by admin

  @Prop({ default: false })
  isFeatured: boolean; // Featured on homepage

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  categories: string[]; // Store categories

  @Prop({ type: Object })
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };

  @Prop({ type: Object })
  businessHours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };

  @Prop()
  phone?: string;

  @Prop()
  address?: string;
}

export const StoreSchema = SchemaFactory.createForClass(Store);

// Indexes
StoreSchema.index({ ownerId: 1 });
StoreSchema.index({ isActive: 1 });
StoreSchema.index({ isFeatured: 1 });
StoreSchema.index({ name: 'text', description: 'text' }); // Full-text search
