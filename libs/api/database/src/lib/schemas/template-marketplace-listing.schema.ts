import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BilingualText } from './store.schema';

export type TemplateMarketplaceListingDocument =
  HydratedDocument<TemplateMarketplaceListing>;

@Schema({ _id: false })
export class TemplateListingPricing {
  @Prop({
    type: String,
    enum: ['free', 'monthly', 'one_time'],
    required: true,
  })
  type!: 'free' | 'monthly' | 'one_time';

  @Prop({ default: 0, min: 0 })
  price!: number;
}

@Schema({ _id: false })
export class TemplateListingStats {
  @Prop({ default: 0, min: 0 })
  installs!: number;

  @Prop({ default: 0, min: 0, max: 5 })
  rating!: number;

  @Prop({ default: 0, min: 0 })
  reviewCount!: number;

  @Prop({ default: 0, min: 0 })
  activeSubscriptions!: number;
}

@Schema({ _id: false })
export class TemplateAttributeSchema {
  @Prop({ required: true })
  key!: string;

  @Prop({
    type: String,
    enum: [
      'string',
      'number',
      'boolean',
      'color',
      'select',
      'image',
      'rich-text',
      'font',
      'spacing',
    ],
    required: true,
  })
  type!: string;

  @Prop({ type: Object, required: true })
  label!: BilingualText;

  @Prop({ type: Object })
  description?: BilingualText;

  @Prop()
  group?: string;

  @Prop({ type: Object })
  default?: unknown;

  @Prop({ type: [Object] })
  options?: { value: string; label: BilingualText }[];

  @Prop({ type: Object })
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };

  @Prop({ type: Object })
  showIf?: {
    key: string;
    value: unknown;
  };
}

@Schema({ timestamps: true, collection: 'template_marketplace_listings' })
export class TemplateMarketplaceListing {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  templateSlug!: string;

  @Prop({ type: Types.ObjectId, ref: 'DeveloperProfile', required: true })
  developerId!: Types.ObjectId;

  @Prop({ type: Object, required: true })
  name!: BilingualText;

  @Prop({ type: Object, required: true })
  description!: BilingualText;

  @Prop({ type: Object })
  longDescription?: BilingualText;

  @Prop()
  thumbnail?: string;

  @Prop({ type: [String], default: [] })
  screenshots!: string[];

  @Prop({ trim: true })
  demoStoreUrl?: string;

  @Prop({ required: true, default: '1.0.0' })
  version!: string;

  @Prop({
    type: Object,
    required: true,
    default: { type: 'free', price: 0 },
  })
  pricing!: TemplateListingPricing;

  @Prop({
    type: Object,
    default: { installs: 0, rating: 0, reviewCount: 0, activeSubscriptions: 0 },
  })
  stats!: TemplateListingStats;

  @Prop({
    type: String,
    enum: ['draft', 'pending_review', 'published', 'rejected', 'suspended'],
    default: 'draft',
  })
  status!: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended';

  @Prop()
  rejectionReason?: string;

  @Prop()
  bundleUrl?: string;

  @Prop({ trim: true })
  githubRepo?: string;

  @Prop({ type: [Object], default: [] })
  attributeSchema!: TemplateAttributeSchema[];

  @Prop({ type: [String], default: [] })
  categories!: string[];

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ default: '1.0.0' })
  sdkVersion!: string;

  @Prop()
  publishedAt?: Date;

  @Prop({ type: [Object], default: [] })
  versionHistory!: {
    version: string;
    bundleUrl: string;
    changelog: string;
    publishedAt: Date;
  }[];

  @Prop()
  lastBuildAt?: Date;

  @Prop()
  lastBuildError?: string;
}

export const TemplateMarketplaceListingSchema = SchemaFactory.createForClass(
  TemplateMarketplaceListing,
);

// Indexes
TemplateMarketplaceListingSchema.index({ templateSlug: 1 }, { unique: true });
TemplateMarketplaceListingSchema.index({ developerId: 1 });
TemplateMarketplaceListingSchema.index({ status: 1 });
TemplateMarketplaceListingSchema.index({ 'pricing.type': 1 });
TemplateMarketplaceListingSchema.index({ categories: 1 });
TemplateMarketplaceListingSchema.index({ tags: 1 });
TemplateMarketplaceListingSchema.index(
  { 'name.en': 'text', 'name.ka': 'text', 'description.en': 'text', 'description.ka': 'text', tags: 'text' },
  { name: 'template_listing_text_search' },
);
