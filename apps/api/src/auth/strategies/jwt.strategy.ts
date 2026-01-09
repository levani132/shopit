import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, Store, StoreDocument } from '@sellit/api-database';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type?: string;
  sessionId?: string;
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

  async validate(payload: JwtPayload): Promise<UserDocument & { storeId?: string }> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    // Load full user from database
    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If user is a seller, also find their store
    let storeId: string | undefined;
    if (user.role === 'seller' || user.role === 'admin') {
      const store = await this.storeModel.findOne({
        ownerId: new Types.ObjectId(payload.sub),
      });
      if (store) {
        storeId = store._id.toString();
      }
    }

    // Extend the user object with storeId
    const userWithStore = user.toObject() as UserDocument & { storeId?: string };
    userWithStore.storeId = storeId;

    return userWithStore;
  }
}
