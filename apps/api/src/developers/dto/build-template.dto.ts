import { IsString, IsOptional, Matches } from 'class-validator';

export class BuildTemplateDto {
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Version must be semver-like (e.g. 1.0.0)',
  })
  @IsOptional()
  version?: string;
}

export class PublishVersionDto {
  @IsString()
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: 'Version must follow semver (e.g. 1.0.0)',
  })
  version!: string;

  @IsString()
  @IsOptional()
  changelog?: string;
}
