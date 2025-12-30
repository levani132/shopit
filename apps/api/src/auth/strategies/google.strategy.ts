import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth2';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: {
      id: string;
      email: string;
      given_name: string;
      family_name: string;
      picture: string;
    },
    done: (error: Error | null, user?: GoogleProfile) => void,
  ) {
    const user: GoogleProfile = {
      id: profile.id,
      email: profile.email,
      name: `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
      picture: profile.picture,
    };

    done(null, user);
  }
}


