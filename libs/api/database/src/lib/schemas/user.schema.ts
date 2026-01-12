import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

// User roles
export enum Role {
  ADMIN = 'admin',
  SELLER = 'seller',
  USER = 'user',
  COURIER = 'courier',
}

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
}

// Shipping address for checkout
@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true })
  _id!: string; // UUID for each address

  @Prop({ default: 'Home' })
  label?: string; // e.g., "Home", "Work"

  @Prop({ required: true })
  address!: string;

  @Prop({ required: true })
  city!: string;

  @Prop()
  postalCode?: string;

  @Prop({ required: true, default: 'Georgia' })
  country!: string;

  @Prop({ required: true })
  phoneNumber!: string;

  @Prop({ default: false })
  isDefault!: boolean;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

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

  // Shipping addresses for checkout
  @Prop({ type: [ShippingAddressSchema], default: [] })
  shippingAddresses!: ShippingAddress[];

  // ================== SELLER BALANCE ==================
  // Only applicable for sellers
  
  @Prop({ default: 0, min: 0 })
  balance!: number; // Current available balance (GEL)

  @Prop({ default: 0, min: 0 })
  totalEarnings!: number; // Total earned from all orders

  @Prop({ default: 0, min: 0 })
  pendingWithdrawals!: number; // Amount currently being withdrawn

  @Prop({ default: 0, min: 0 })
  totalWithdrawn!: number; // Total amount successfully withdrawn

  // ================== COURIER FIELDS ==================
  // Only applicable for couriers

  @Prop({ default: false })
  isCourierApproved!: boolean; // Admin approval status for couriers

  @Prop()
  courierAppliedAt?: Date; // When user applied to become a courier

  @Prop()
  courierApprovedAt?: Date; // When admin approved the courier

  @Prop({ trim: true })
  vehicleType?: string; // e.g., 'car', 'motorcycle', 'bicycle', 'walking'

  @Prop({ type: [String], default: [] })
  workingAreas?: string[]; // Regions/areas the courier operates in
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual for full name
UserSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});
