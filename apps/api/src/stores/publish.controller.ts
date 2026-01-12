import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserDocument } from '@sellit/api-database';
import { PublishService } from './publish.service';

@ApiTags('Store Publishing')
@Controller('stores/publish')
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  @Get('requirements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check missing fields required for publishing' })
  @ApiResponse({ status: 200, description: 'Missing fields returned' })
  async checkRequirements(@CurrentUser() user: UserDocument) {
    return this.publishService.checkMissingFields(user._id.toString());
  }

  @Post('request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request to publish the store' })
  @ApiResponse({ status: 200, description: 'Publish request submitted' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  async requestPublish(
    @CurrentUser() user: UserDocument,
    @Body() body: { message: string },
  ) {
    const store = await this.publishService.requestPublish(
      user._id.toString(),
      body.message,
    );

    return {
      message: 'Publish request submitted successfully',
      publishStatus: store.publishStatus,
      publishRequestedAt: store.publishRequestedAt,
    };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current publish status' })
  @ApiResponse({ status: 200, description: 'Publish status returned' })
  async getPublishStatus(@CurrentUser() user: UserDocument) {
    const missing = await this.publishService.checkMissingFields(
      user._id.toString(),
    );

    // Get store by ownerId (stores have ownerId pointing to user)
    const store = await this.publishService['storeModel'].findOne({
      ownerId: user._id,
    });

    return {
      publishStatus: store?.publishStatus || 'draft',
      publishRequestedAt: store?.publishRequestedAt,
      publishedAt: store?.publishedAt,
      publishRejectionReason: store?.publishRejectionReason,
      missingFields: missing,
    };
  }

  // ================== ADMIN ENDPOINTS ==================

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stores pending review (admin)' })
  @ApiResponse({ status: 200, description: 'Pending stores returned' })
  async getPendingStores() {
    const stores = await this.publishService.getPendingStores();
    return stores.map((store) => ({
      id: store._id,
      name: store.name,
      subdomain: store.subdomain,
      publishRequestedAt: store.publishRequestedAt,
      publishMessage: store.publishMessage,
      owner: store.owner,
    }));
  }

  @Post('admin/:storeId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a store publish request (admin)' })
  @ApiResponse({ status: 200, description: 'Store approved' })
  async approvePublish(@Param('storeId') storeId: string) {
    const store = await this.publishService.approvePublish(storeId);
    return {
      message: 'Store approved and published',
      publishStatus: store.publishStatus,
      publishedAt: store.publishedAt,
    };
  }

  @Post('admin/:storeId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a store publish request (admin)' })
  @ApiResponse({ status: 200, description: 'Store rejected' })
  async rejectPublish(
    @Param('storeId') storeId: string,
    @Body() body: { reason: string },
  ) {
    const store = await this.publishService.rejectPublish(storeId, body.reason);
    return {
      message: 'Store publish request rejected',
      publishStatus: store.publishStatus,
      publishRejectionReason: store.publishRejectionReason,
    };
  }
}
