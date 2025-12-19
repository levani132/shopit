import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  STORE_OWNER = 'STORE_OWNER',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.STORE_OWNER })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
