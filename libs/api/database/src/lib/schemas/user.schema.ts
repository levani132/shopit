import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

// User roles
export enum Role {
  ADMIN = 'admin',
  SELLER = 'seller',
  USER = 'user',
}

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
}

// Device tracking for multi-device support
@Schema({ _id: false })
export class KnownDevice {
  @Prop({ required: true })
  fingerprint!: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: Date.now })
  lastSeen!: Date;

  @Prop({ default: false })
  trusted!: boolean;

  @Prop()
  sessionId?: string;

  @Prop()
  refreshToken?: string;

  @Prop()
  refreshTokenJti?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const KnownDeviceSchema = SchemaFactory.createForClass(KnownDevice);

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: false }) // Optional for OAuth users
  password?: string;

  @Prop({ type: String, enum: AuthProvider, default: AuthProvider.EMAIL })
  authProvider!: AuthProvider;

  @Prop() // Google user ID for OAuth
  googleId?: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ trim: true })
  phoneNumber?: string;

  @Prop({ trim: true })
  identificationNumber?: string; // Georgian personal ID (11 digits)

  @Prop({ trim: true })
  accountNumber?: string; // Georgian IBAN

  @Prop({ trim: true })
  beneficiaryBankCode?: string; // SWIFT/BIC code

  @Prop({ type: String, enum: Role, default: Role.SELLER })
  role!: Role;

  @Prop({ default: false })
  isProfileComplete!: boolean;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop()
  verificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  // Session management
  @Prop()
  refreshToken?: string; // JTI of current refresh token (legacy support)

  @Prop()
  sessionId?: string; // Current session ID

  @Prop()
  lastActivity?: Date;

  // Multi-device support
  @Prop({ type: [KnownDeviceSchema], default: [] })
  knownDevices!: KnownDevice[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual for full name
UserSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});
