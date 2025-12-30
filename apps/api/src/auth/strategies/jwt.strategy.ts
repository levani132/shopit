import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@sellit/api-database';
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

  async validate(payload: JwtPayload): Promise<UserDocument> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    // Load full user from database
    const user = await this.userModel.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
