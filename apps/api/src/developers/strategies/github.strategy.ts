import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

export interface GitHubProfile {
  id: string;
  login: string;
  accessToken: string;
}

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    const clientID =
      configService.get<string>('GITHUB_CLIENT_ID') || '';
    const clientSecret =
      configService.get<string>('GITHUB_CLIENT_SECRET') || '';
    const callbackURL =
      configService.get<string>('GITHUB_CALLBACK_URL') || '';

    super({
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID,
      clientSecret,
      callbackURL,
      scope: 'read:user',
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    _profile: Record<string, unknown>,
    done: (error: Error | null, user?: GitHubProfile) => void,
  ) {
    // Fetch GitHub user info with the access token
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      done(new Error('Failed to fetch GitHub profile'));
      return;
    }

    const data = (await res.json()) as { id: number; login: string };

    const user: GitHubProfile = {
      id: String(data.id),
      login: data.login,
      accessToken,
    };

    done(null, user);
  }
}
