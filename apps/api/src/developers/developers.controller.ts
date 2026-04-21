import { Role } from '@shopit/constants';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { UserDocument } from '@shopit/api-database';
import { DevelopersService } from './developers.service';
import { TemplateBuildService } from './template-build.service';
import { GithubGitService } from './github-git.service';
import {
  ApplyDeveloperDto,
  UpdateDeveloperProfileDto,
  AdminRejectDeveloperDto,
  CreateTemplateListingDto,
  UpdateTemplateListingDto,
  ScaffoldTemplateDto,
  BuildTemplateDto,
  PublishVersionDto,
} from './dto';

@ApiTags('Developers')
@Controller('developers')
export class DevelopersController {
  private readonly logger = new Logger(DevelopersController.name);

  constructor(
    private readonly developersService: DevelopersService,
    private readonly templateBuildService: TemplateBuildService,
    private readonly githubGitService: GithubGitService,
    private readonly configService: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Developer registration & profile
  // ---------------------------------------------------------------------------

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become a template developer' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  @ApiResponse({ status: 409, description: 'Already applied' })
  async apply(
    @CurrentUser() user: UserDocument,
    @Body() dto: ApplyDeveloperDto,
  ) {
    return this.developersService.apply(user._id.toString(), dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my developer profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getMyProfile(@CurrentUser() user: UserDocument) {
    return this.developersService.getMyProfile(user._id.toString());
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get developer dashboard stats' })
  @ApiResponse({ status: 200, description: 'Developer stats retrieved' })
  async getMyStats(@CurrentUser() user: UserDocument) {
    return this.developersService.getMyStats(user._id.toString());
  }

  @Put('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my developer profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMyProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateDeveloperProfileDto,
  ) {
    return this.developersService.updateMyProfile(user._id.toString(), dto);
  }

  // ---------------------------------------------------------------------------
  // GitHub OAuth — Connect GitHub account (manual OAuth flow)
  // ---------------------------------------------------------------------------

  /**
   * Encrypt the userId into a signed state parameter for safe round-trip.
   */
  private createOAuthState(userId: string): string {
    const secret = this.configService.get('JWT_SECRET') || 'default-access-secret';
    const hmac = crypto.createHmac('sha256', secret).update(userId).digest('hex');
    const payload = Buffer.from(JSON.stringify({ uid: userId, sig: hmac })).toString('base64url');
    return payload;
  }

  /**
   * Verify and extract userId from the signed state parameter.
   */
  private verifyOAuthState(state: string): string | null {
    try {
      const secret = this.configService.get('JWT_SECRET') || 'default-access-secret';
      const { uid, sig } = JSON.parse(Buffer.from(state, 'base64url').toString());
      const expected = crypto.createHmac('sha256', secret).update(uid).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
      return uid;
    } catch {
      return null;
    }
  }

  @Get('github/connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redirect to GitHub OAuth to link account' })
  async githubConnect(@CurrentUser() user: UserDocument, @Res() res: Response) {
    const clientId = this.configService.get('GITHUB_CLIENT_ID');
    const callbackUrl = this.configService.get('GITHUB_CALLBACK_URL');

    if (!clientId || !callbackUrl) {
      const devPortalUrl = this.configService.get('DEVELOPERS_PORTAL_URL') || 'http://developers.localhost:3000';
      res.redirect(`${devPortalUrl}/ka/dashboard/profile?github_error=not_configured`);
      return;
    }

    const state = this.createOAuthState(user._id.toString());
    const scope = 'read:user,repo';
    const githubAuthUrl =
      `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}`;

    res.redirect(githubAuthUrl);
  }

  @Get('github/callback')
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const devPortalUrl = this.configService.get('DEVELOPERS_PORTAL_URL') || 'http://developers.localhost:3000';
    const profileUrl = `${devPortalUrl}/ka/dashboard/profile`;

    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state) {
      res.redirect(`${profileUrl}?github_error=missing_params`);
      return;
    }

    // Verify the state to get the userId
    const userId = this.verifyOAuthState(state);
    if (!userId) {
      res.redirect(`${profileUrl}?github_error=invalid_state`);
      return;
    }

    // Exchange code for access token
    const clientId = this.configService.get('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get('GITHUB_CLIENT_SECRET');

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenData.access_token) {
      this.logger.error(`GitHub token exchange failed: ${tokenData.error}`);
      res.redirect(`${profileUrl}?github_error=token_exchange`);
      return;
    }

    // Fetch GitHub user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    if (!userRes.ok) {
      res.redirect(`${profileUrl}?github_error=profile_fetch`);
      return;
    }

    const ghUser = (await userRes.json()) as { login: string };

    // Store the GitHub connection
    await this.developersService.connectGithub(
      userId,
      ghUser.login,
      tokenData.access_token,
    );

    this.logger.log(`GitHub connected for user ${userId}: ${ghUser.login}`);
    res.redirect(
      `${profileUrl}?github_connected=${encodeURIComponent(ghUser.login)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Template scaffold generator
  // ---------------------------------------------------------------------------

  @Post('templates/scaffold')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a template scaffold (boilerplate files)' })
  @ApiResponse({ status: 201, description: 'Scaffold generated' })
  async scaffoldTemplate(@Body() dto: ScaffoldTemplateDto) {
    const files = this.developersService.generateScaffold(dto);
    return { files };
  }

  @Post('templates/scaffold/github')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create GitHub repo from scaffold' })
  @ApiResponse({ status: 201, description: 'GitHub repository created with scaffold' })
  async scaffoldToGithub(
    @CurrentUser() user: UserDocument,
    @Body() dto: ScaffoldTemplateDto,
  ) {
    return this.developersService.createGithubRepo(user._id.toString(), dto);
  }

  // ---------------------------------------------------------------------------
  // Template CRUD (developer-facing)
  // ---------------------------------------------------------------------------

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new template listing' })
  @ApiResponse({ status: 201, description: 'Template listing created' })
  async createTemplateListing(
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateTemplateListingDto,
  ) {
    return this.developersService.createTemplateListing(
      user._id.toString(),
      dto,
    );
  }

  @Get('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my template listings' })
  @ApiResponse({ status: 200, description: 'Template listings retrieved' })
  async getMyTemplateListings(@CurrentUser() user: UserDocument) {
    return this.developersService.getMyTemplateListings(user._id.toString());
  }

  @Get('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific template listing' })
  @ApiResponse({ status: 200, description: 'Template listing retrieved' })
  async getTemplateListing(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
  ) {
    return this.developersService.getTemplateListing(
      user._id.toString(),
      listingId,
    );
  }

  @Put('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a template listing' })
  @ApiResponse({ status: 200, description: 'Template listing updated' })
  async updateTemplateListing(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
    @Body() dto: UpdateTemplateListingDto,
  ) {
    return this.developersService.updateTemplateListing(
      user._id.toString(),
      listingId,
      dto,
    );
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a template listing' })
  @ApiResponse({ status: 200, description: 'Template listing deleted' })
  async deleteTemplateListing(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
  ) {
    return this.developersService.deleteTemplateListing(
      user._id.toString(),
      listingId,
    );
  }

  @Post('templates/:id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit template for review (must be built first)' })
  @ApiResponse({ status: 200, description: 'Template submitted for review' })
  async submitForReview(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
  ) {
    return this.developersService.submitForReview(
      user._id.toString(),
      listingId,
    );
  }

  // ---------------------------------------------------------------------------
  // Build & Version management
  // ---------------------------------------------------------------------------

  @Post('templates/:id/build')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Build template from GitHub source → validate → bundle → upload to S3',
  })
  @ApiResponse({ status: 201, description: 'Build completed' })
  async buildTemplate(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
    @Body() dto: BuildTemplateDto,
  ) {
    return this.templateBuildService.buildTemplate(
      user._id.toString(),
      listingId,
      dto.version,
    );
  }

  @Get('templates/:id/versions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get version history for a template' })
  @ApiResponse({ status: 200, description: 'Version history retrieved' })
  async getVersionHistory(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
  ) {
    return this.templateBuildService.getVersionHistory(
      user._id.toString(),
      listingId,
    );
  }

  @Post('templates/:id/versions/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish current build as a new version' })
  @ApiResponse({ status: 201, description: 'Version published' })
  async publishVersion(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
    @Body() dto: PublishVersionDto,
  ) {
    return this.templateBuildService.publishVersion(
      user._id.toString(),
      listingId,
      dto.version,
      dto.changelog,
    );
  }

  // ---------------------------------------------------------------------------
  // Git operations (GitHub-backed)
  // ---------------------------------------------------------------------------

  @Get('templates/:id/git/info')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get repo info for a template' })
  async getRepoInfo(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
  ) {
    return this.githubGitService.getRepoInfo(user._id.toString(), listingId);
  }

  @Get('templates/:id/git/files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all files in the repo' })
  async listRepoFiles(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
    @Query('ref') ref?: string,
  ) {
    return this.githubGitService.listFiles(
      user._id.toString(),
      listingId,
      ref || 'main',
    );
  }

  @Get('templates/:id/git/file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get file content from the repo' })
  async getRepoFile(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
    @Query('path') filePath: string,
    @Query('ref') ref?: string,
  ) {
    return this.githubGitService.getFileContent(
      user._id.toString(),
      listingId,
      filePath,
      ref || 'main',
    );
  }

  @Post('templates/:id/git/commit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Commit and push files to the repo' })
  async commitAndPush(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
    @Body() body: { files: { path: string; content: string }[]; message: string; deletions?: string[] },
  ) {
    return this.githubGitService.commitAndPush(
      user._id.toString(),
      listingId,
      body.files,
      body.message,
      'main',
      body.deletions || [],
    );
  }

  @Get('templates/:id/git/log')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DEVELOPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get commit history' })
  async getCommitLog(
    @CurrentUser() user: UserDocument,
    @Param('id') listingId: string,
    @Query('ref') ref?: string,
  ) {
    return this.githubGitService.getCommitLog(
      user._id.toString(),
      listingId,
      ref || 'main',
    );
  }

  // ---------------------------------------------------------------------------
  // Admin: Developer & template approvals
  // ---------------------------------------------------------------------------

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending developer applications (admin)' })
  @ApiResponse({ status: 200, description: 'Pending applications retrieved' })
  async getPendingApplications() {
    return this.developersService.getPendingApplications();
  }

  @Post('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a developer application (admin)' })
  @ApiResponse({ status: 200, description: 'Developer approved' })
  async approveApplication(@Param('id') profileId: string) {
    return this.developersService.approveApplication(profileId);
  }

  @Post('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a developer application (admin)' })
  @ApiResponse({ status: 200, description: 'Developer rejected' })
  async rejectApplication(
    @Param('id') profileId: string,
    @Body() dto: AdminRejectDeveloperDto,
  ) {
    return this.developersService.rejectApplication(profileId, dto.reason);
  }

  @Get('admin/templates/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending template reviews (admin)' })
  @ApiResponse({ status: 200, description: 'Pending templates retrieved' })
  async getPendingTemplateReviews() {
    return this.developersService.getPendingTemplateReviews();
  }

  @Post('admin/templates/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a template listing (admin)' })
  @ApiResponse({ status: 200, description: 'Template approved' })
  async approveTemplate(@Param('id') listingId: string) {
    return this.developersService.approveTemplate(listingId);
  }

  @Post('admin/templates/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a template listing (admin)' })
  @ApiResponse({ status: 200, description: 'Template rejected' })
  async rejectTemplate(
    @Param('id') listingId: string,
    @Body() dto: AdminRejectDeveloperDto,
  ) {
    return this.developersService.rejectTemplate(listingId, dto.reason);
  }

  // ---------------------------------------------------------------------------
  // Public: Browse published templates (marketplace)
  // ---------------------------------------------------------------------------

  @Get('marketplace')
  @ApiOperation({ summary: 'Browse published templates' })
  @ApiResponse({ status: 200, description: 'Published templates retrieved' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'pricingType', required: false, enum: ['free', 'monthly', 'one_time'] })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['popular', 'newest', 'rating', 'price_asc', 'price_desc'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPublishedTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('pricingType') pricingType?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.developersService.getPublishedTemplates({
      search,
      category,
      pricingType,
      sortBy,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('marketplace/:slug')
  @ApiOperation({ summary: 'Get a published template by slug' })
  @ApiResponse({ status: 200, description: 'Template retrieved' })
  async getPublishedTemplateBySlug(@Param('slug') slug: string) {
    return this.developersService.getPublishedTemplateBySlug(slug);
  }
}
