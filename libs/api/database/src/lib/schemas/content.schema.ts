import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// ===== FAQ Schema =====
export type FaqDocument = Faq & Document;

@Schema({ timestamps: true })
export class Faq {
  @Prop({ required: true })
  questionKa: string;

  @Prop({ required: true })
  questionEn: string;

  @Prop({ required: true })
  answerKa: string;

  @Prop({ required: true })
  answerEn: string;

  @Prop({ 
    type: String, 
    enum: ['general', 'sellers', 'buyers', 'couriers', 'payments'],
    default: 'general' 
  })
  category: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);

// ===== About Content Schema =====
export type AboutContentDocument = AboutContent & Document;

@Schema({ timestamps: true })
export class AboutContent {
  @Prop({ default: '' })
  missionKa: string;

  @Prop({ default: '' })
  missionEn: string;

  @Prop({ default: '' })
  storyKa: string;

  @Prop({ default: '' })
  storyEn: string;

  @Prop({ type: [{ name: String, role: String, image: String }], default: [] })
  teamMembers: Array<{
    name: string;
    role: string;
    image?: string;
  }>;
}

export const AboutContentSchema = SchemaFactory.createForClass(AboutContent);

// ===== Contact Content Schema =====
export type ContactContentDocument = ContactContent & Document;

@Schema({ timestamps: true })
export class ContactContent {
  @Prop({ default: 'support@shopit.ge' })
  email: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  workingHours: string;

  @Prop({ type: Object, default: {} })
  socialLinks: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export const ContactContentSchema = SchemaFactory.createForClass(ContactContent);

// ===== Contact Form Submission Schema =====
export type ContactSubmissionDocument = ContactSubmission & Document;

@Schema({ timestamps: true })
export class ContactSubmission {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: 'pending', enum: ['pending', 'read', 'replied', 'archived'] })
  status: string;

  @Prop()
  adminNotes?: string;
}

export const ContactSubmissionSchema = SchemaFactory.createForClass(ContactSubmission);

// ===== Terms of Service Schema =====
export type TermsContentDocument = TermsContent & Document;

@Schema({ timestamps: true })
export class TermsContent {
  @Prop({ default: '' })
  contentKa: string;

  @Prop({ default: '' })
  contentEn: string;

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;
}

export const TermsContentSchema = SchemaFactory.createForClass(TermsContent);

// ===== Privacy Policy Schema =====
export type PrivacyContentDocument = PrivacyContent & Document;

@Schema({ timestamps: true })
export class PrivacyContent {
  @Prop({ default: '' })
  contentKa: string;

  @Prop({ default: '' })
  contentEn: string;

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;
}

export const PrivacyContentSchema = SchemaFactory.createForClass(PrivacyContent);

