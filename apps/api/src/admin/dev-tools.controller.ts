import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DevToolsService } from './dev-tools.service';
import {
  CleanupDto,
  SeedUsersDto,
  SeedProductsDto,
  SeedOrdersDto,
} from './dto/dev-tools.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { Role } from '@shopit/constants';

@ApiTags('dev-tools')
@Controller('dev-tools')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DevToolsController {
  constructor(private readonly devToolsService: DevToolsService) {}

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get database statistics',
    description: 'Returns counts of all major collections (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Database statistics retrieved successfully',
  })
  async getStats() {
    return this.devToolsService.getStats();
  }

  @Get('seeded-users')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all seeded users',
    description:
      'Retrieve list of all users created by dev tools seeding with their credentials. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Seeded users retrieved successfully',
    schema: {
      example: {
        users: [
          {
            id: '507f1f77bcf86cd799439012',
            email: 'seller1@test.ge',
            password: 'password123',
            firstName: 'დავით',
            lastName: 'გელაშვილი',
            role: 'Seller',
            roleNumber: 4,
            store: {
              id: '507f1f77bcf86cd799439013',
              subdomain: 'seller1shop',
              name: 'დავით მაღაზია',
            },
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getSeededUsers() {
    return this.devToolsService.getSeededUsers();
  }

  @Post('cleanup')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cleanup database',
    description:
      'Clear database based on level: LEVEL_1 (orders/balances), LEVEL_2 (products/categories), LEVEL_3 (users/stores). Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Database cleanup completed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async cleanup(@Body() dto: CleanupDto) {
    return this.devToolsService.cleanup(dto.level);
  }

  @Post('seed/users')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Seed users',
    description:
      'Create test users with different roles (buyers, sellers, couriers). All passwords are "password123". Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Users seeded successfully',
    schema: {
      example: {
        users: [
          {
            id: '507f1f77bcf86cd799439012',
            email: 'seller1@test.ge',
            password: 'password123',
            firstName: 'დავით',
            lastName: 'გელაშვილი',
            role: 'Seller',
            roleNumber: 4,
            store: {
              id: '507f1f77bcf86cd799439013',
              subdomain: 'seller1shop',
              name: 'დავით მაღაზია',
            },
          },
          {
            id: '507f1f77bcf86cd799439014',
            email: 'courier1@test.ge',
            password: 'password123',
            firstName: 'ნიკა',
            lastName: 'კვარაცხელია',
            role: 'Courier',
            roleNumber: 2,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async seedUsers(@Body() dto: SeedUsersDto) {
    return this.devToolsService.seedUsers(dto);
  }

  @Post('seed/products')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Seed products',
    description:
      'Create test products with categories, subcategories, and attributes. Requires existing stores (seed users first). Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Products seeded successfully',
    schema: {
      example: {
        productsCreated: 30,
        categoriesCreated: 5,
        storesUsed: 3,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - No stores found (seed users first)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async seedProducts(@Body() dto: SeedProductsDto) {
    return this.devToolsService.seedProducts(dto);
  }

  @Post('seed/orders')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Seed orders',
    description:
      'Create test orders based on existing products, users, and stores. Requires existing products, users, and couriers. Admin only.',
  })
  @ApiResponse({
    status: 201,
    description: 'Orders seeded successfully',
    schema: {
      example: {
        ordersCreated: 50,
        productsUsed: 30,
        storesUsed: 3,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Missing prerequisites (products, stores, users, or couriers)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async seedOrders(@Body() dto: SeedOrdersDto) {
    return this.devToolsService.seedOrders(dto);
  }
}
