import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DevelopersController } from './developers.controller';
import { DevelopersService } from './developers.service';
import { TemplateBuildService } from './template-build.service';
import { GithubGitService } from './github-git.service';
import {
  DeveloperProfile,
  DeveloperProfileSchema,
  TemplateMarketplaceListing,
  TemplateMarketplaceListingSchema,
  User,
  UserSchema,
} from '@shopit/api-database';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeveloperProfile.name, schema: DeveloperProfileSchema },
      {
        name: TemplateMarketplaceListing.name,
        schema: TemplateMarketplaceListingSchema,
      },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [DevelopersController],
  providers: [DevelopersService, TemplateBuildService, GithubGitService],
  exports: [DevelopersService, TemplateBuildService],
})
export class DevelopersModule {}
