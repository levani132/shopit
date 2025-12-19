import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InfoPageDocument = HydratedDocument<InfoPage>;

export class FaqItem {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;
}

@Schema({ timestamps: true, collection: 'info_pages' })
export class InfoPage {
  @Prop()
  aboutContent?: string;

  @Prop({ lowercase: true, trim: true })
  contactEmail?: string;

  @Prop({ trim: true })
  contactPhone?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop()
  policies?: string;

  @Prop({ type: [{ question: String, answer: String }], default: [] })
  faq: FaqItem[];

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true, unique: true })
  storeId: Types.ObjectId;
}

export const InfoPageSchema = SchemaFactory.createForClass(InfoPage);
