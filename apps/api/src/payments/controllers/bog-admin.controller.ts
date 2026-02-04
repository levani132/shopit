import { Role } from '@shopit/constants';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as express from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { BogTransferService } from '../services/bog-transfer.service';

@Controller('admin/bog')
export class BogAdminController {
  private readonly logger = new Logger(BogAdminController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly bogTransferService: BogTransferService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
  }

  /**
   * Initiate OAuth2 authorization flow
   * Redirects user to BOG login page
   */
  @Get('auth/authorize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async authorize(@Res() res: express.Response) {
    try {
      const authUrl = this.bogTransferService.getAuthorizationUrl();
      return res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Failed to initiate authorization', error);
      throw error;
    }
  }

  /**
   * OAuth2 callback endpoint
   * BOG redirects here after user authorizes the app
   */
  @Get('auth/callback')
  @UseGuards(OptionalJwtAuthGuard)
  async callback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: express.Response,
  ) {
    try {
      if (error) {
        this.logger.error(`Authorization error: ${error}`);
        return res.redirect(
          `${this.frontendUrl}/dashboard/balance?bog_error=${error}`,
        );
      }

      if (!code) {
        this.logger.error('No authorization code received');
        return res.redirect(
          `${this.frontendUrl}/dashboard/balance?bog_error=no_code`,
        );
      }

      this.logger.log(
        `Received authorization code: ${code.substring(0, 10)}...`,
      );

      // Exchange code for access token
      await this.bogTransferService.exchangeCodeForToken(code);

      this.logger.log('Successfully obtained access token via OAuth2 flow');

      // Redirect back to frontend with success
      return res.redirect(
        `${this.frontendUrl}/dashboard/balance?bog_auth=success`,
      );
    } catch (error) {
      this.logger.error('OAuth2 callback failed', error);
      return res.redirect(
        `${this.frontendUrl}/dashboard/balance?bog_error=callback_failed`,
      );
    }
  }

  /**
   * Check if user is authenticated with BOG OAuth2
   */
  @Get('auth/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async checkAuthStatus() {
    const isAuthenticated = this.bogTransferService.isAuthenticated();
    const userInfo = this.bogTransferService.getUserInfo();
    return {
      success: true,
      authenticated: isAuthenticated,
      configured: this.bogTransferService.isConfigured(),
      user: userInfo,
    };
  }

  /**
   * Logout - clear BOG OAuth2 tokens
   */
  @Post('auth/logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async logout() {
    this.bogTransferService.clearTokens();
    return {
      success: true,
      message: 'Successfully logged out from BOG',
    };
  }

  /**
   * Get company account balance
   */
  @Get('balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAccountBalance() {
    try {
      const info = await this.bogTransferService.getAccountBalance();
      return {
        success: true,
        data: info,
      };
    } catch (error) {
      this.logger.error('Failed to get account balance', error);
      throw error;
    }
  }

  /**
   * Get document status by UniqueKey
   */
  @Get('document/:uniqueKey')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getDocumentStatus(@Param('uniqueKey') uniqueKey: string) {
    try {
      this.logger.log(`Checking status for document: ${uniqueKey}`);
      const status = await this.bogTransferService.getDocumentStatus(
        Number(uniqueKey),
      );
      this.logger.log(`Document ${uniqueKey} status: ${JSON.stringify(status)}`);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(`Failed to get document status for ${uniqueKey}`, error);
      throw error;
    }
  }

  /**
   * Request OTP for document signing
   */
  @Post('request-otp')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body('uniqueKey') uniqueKey?: number) {
    try {
      await this.bogTransferService.requestOtp(uniqueKey);
      return {
        success: true,
        message: 'OTP has been sent to your phone/email',
      };
    } catch (error) {
      this.logger.error('Failed to request OTP', error);
      throw error;
    }
  }

  /**
   * Sign a document with OTP
   */
  @Post('sign-document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async signDocument(
    @Body('uniqueKey') uniqueKey: number,
    @Body('otp') otp: string,
  ) {
    try {
      await this.bogTransferService.signDocument(uniqueKey, otp);
      return {
        success: true,
        message: 'Document signed and executed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to sign document ${uniqueKey}`, error);
      throw error;
    }
  }

  /**
   * Cancel a pending document
   */
  @Post('cancel-document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async cancelDocument(@Body('uniqueKey') uniqueKey: number) {
    try {
      const result = await this.bogTransferService.cancelDocument(uniqueKey);
      return {
        success: result,
        message: result
          ? 'Document cancelled successfully'
          : 'Document could not be cancelled (may already be processed)',
      };
    } catch (error) {
      this.logger.error(`Failed to cancel document ${uniqueKey}`, error);
      throw error;
    }
  }
}

