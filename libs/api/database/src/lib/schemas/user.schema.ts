import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  STORE_OWNER = 'STORE_OWNER',
}

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false }) // Optional for OAuth users
  password?: string;

  @Prop({ type: String, enum: AuthProvider, default: AuthProvider.EMAIL })
  authProvider: AuthProvider;

  @Prop() // Google user ID for OAuth
  googleId?: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ trim: true })
  phoneNumber?: string;

  @Prop({ trim: true })
  identificationNumber?: string; // Georgian personal ID (11 digits)

  @Prop({ trim: true })
  accountNumber?: string; // Georgian IBAN

  @Prop({ trim: true })
  beneficiaryBankCode?: string; // SWIFT/BIC code

  @Prop({ type: String, enum: UserRole, default: UserRole.STORE_OWNER })
  role: UserRole;

  @Prop({ default: false })
  isProfileComplete: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual for full name
UserSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});
