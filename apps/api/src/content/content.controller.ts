import { Role } from '@sellit/constants';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import {
  Faq,
  AboutContent,
  ContactContent,
  TermsContent,
  PrivacyContent,
} from '@sellit/api-database';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ===== Public FAQ Endpoints =====
  @Get('faq')
  async getPublicFaqs() {
    return this.contentService.getActiveFaqs();
  }

  // ===== Public About Endpoint =====
  @Get('about')
  async getAbout() {
    return this.contentService.getAboutContent();
  }

  // ===== Public Contact Endpoints =====
  @Get('contact')
  async getContact() {
    return this.contentService.getContactContent();
  }

  @Post('contact/submit')
  async submitContactForm(
    @Body()
    data: {
      name: string;
      email: string;
      subject: string;
      message: string;
    },
  ) {
    await this.contentService.createSubmission(data);
    return { success: true };
  }

  // ===== Public Terms Endpoint =====
  @Get('terms')
  async getTerms() {
    return this.contentService.getTermsContent();
  }

  // ===== Public Privacy Endpoint =====
  @Get('privacy')
  async getPrivacy() {
    return this.contentService.getPrivacyContent();
  }

  // ===== Admin FAQ Endpoints =====
  @Get('admin/faq')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllFaqs() {
    return this.contentService.getAllFaqs();
  }

  @Post('admin/faq')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createFaq(@Body() data: Partial<Faq>) {
    return this.contentService.createFaq(data);
  }

  @Put('admin/faq/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateFaq(@Param('id') id: string, @Body() data: Partial<Faq>) {
    return this.contentService.updateFaq(id, data);
  }

  @Delete('admin/faq/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteFaq(@Param('id') id: string) {
    await this.contentService.deleteFaq(id);
    return { success: true };
  }

  @Post('admin/faq/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async seedFaqs() {
    await this.contentService.seedInitialFaqs();
    return { success: true };
  }

  // ===== Admin About Endpoints =====
  @Put('admin/about')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateAbout(@Body() data: Partial<AboutContent>) {
    return this.contentService.updateAboutContent(data);
  }

  // ===== Admin Contact Endpoints =====
  @Put('admin/contact')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateContact(@Body() data: Partial<ContactContent>) {
    return this.contentService.updateContactContent(data);
  }

  @Get('admin/contact/submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getSubmissions(@Query('status') status?: string) {
    return this.contentService.getSubmissions(status);
  }

  @Put('admin/contact/submissions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateSubmission(
    @Param('id') id: string,
    @Body() data: { status: string; adminNotes?: string },
  ) {
    return this.contentService.updateSubmissionStatus(
      id,
      data.status,
      data.adminNotes,
    );
  }

  // ===== Admin Terms Endpoints =====
  @Put('admin/terms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateTerms(@Body() data: Partial<TermsContent>) {
    return this.contentService.updateTermsContent(data);
  }

  // ===== Admin Privacy Endpoints =====
  @Put('admin/privacy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updatePrivacy(@Body() data: Partial<PrivacyContent>) {
    return this.contentService.updatePrivacyContent(data);
  }
}
