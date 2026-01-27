import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
  Store,
  StoreDocument,
  Role,
} from '@shopit/api-database';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  role: number; // Now a bitmask number
  type?: string;
  sessionId?: string;
  impersonatedBy?: string; // Admin ID if this is an impersonation session
  iat: number;
  exp: number;
}

// Cookie extractor function
const cookieExtractor = (req: Request): string | null => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['access_token'];
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
  ) {
    super({
      // Try cookie first, then fall back to bearer token
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'default-access-secret',
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<UserDocument & { storeId?: string; impersonatedBy?: string }> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    // Load full user from database
    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If user is a seller or admin, also find their store
    // We check for store ownership even for admins in case they also have a store
    let storeId: string | undefined;
    const isSeller = (user.role & Role.SELLER) !== 0;
    const isAdmin = (user.role & Role.ADMIN) !== 0;
    console.log('JWT validate - user role:', user.role, 'isSeller:', isSeller, 'isAdmin:', isAdmin);
    if (isSeller || isAdmin) {
      const store = await this.storeModel.findOne({
        ownerId: new Types.ObjectId(payload.sub),
      });
      console.log('JWT validate - found store:', store?._id?.toString());
      if (store) {
        storeId = store._id.toString();
        // If user has a store but doesn't have SELLER role, fix it
        if (!isSeller) {
          console.log('JWT validate - user has store but missing SELLER role, updating...');
          await this.userModel.updateOne(
            { _id: user._id },
            { $bit: { role: { or: Role.SELLER } } }
          );
        }
      }
    }

    // Extend the user object with storeId and impersonatedBy
    const userWithExtras = user.toObject() as UserDocument & {
      storeId?: string;
      impersonatedBy?: string;
    };
    userWithExtras.storeId = storeId;
    userWithExtras.impersonatedBy = payload.impersonatedBy;

    return userWithExtras;
  }
}
