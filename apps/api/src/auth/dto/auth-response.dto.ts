import { ApiProperty } from '@nestjs/swagger';

export class TokensDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ required: false })
  sessionToken?: string;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ required: false })
  isProfileComplete?: boolean;
}

export class StoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  subdomain!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  brandColor!: string;

  @ApiProperty({ required: false })
  description?: string;
}

export class AuthResponseDto {
  @ApiProperty()
  user!: UserResponseDto;

  @ApiProperty({ required: false })
  store?: StoreResponseDto;

  @ApiProperty({ required: false })
  tokens?: TokensDto;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh' | 'session';
  sessionId?: string;
  jti?: string;
  deviceTrusted?: boolean;
}
