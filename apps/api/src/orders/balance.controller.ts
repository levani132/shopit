import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { BalanceService } from './balance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserDocument } from '@sellit/api-database';

@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  /**
   * Debug endpoint - check order data for balance calculation
   */
  @Get('debug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async debugBalance(@CurrentUser() user: UserDocument & { storeId?: string }) {
    return this.balanceService.debugBalance(user._id.toString());
  }

  /**
   * Get current seller's balance summary
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async getBalance(@CurrentUser() user: UserDocument & { storeId?: string }) {
    const result = await this.balanceService.getSellerBalance(user._id.toString());
    // Map to frontend-expected field names
    return {
      availableBalance: result.balance,
      pendingBalance: result.pendingWithdrawals,
      totalEarnings: result.totalEarnings,
      totalWithdrawn: result.totalWithdrawn,
      waitingEarnings: result.waitingEarnings,
    };
  }

  /**
   * Get current courier's balance summary
   */
  @Get('courier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('courier')
  async getCourierBalance(@CurrentUser() user: UserDocument) {
    const result = await this.balanceService.getCourierBalance(user._id.toString());
    return {
      balance: result.balance,
      pendingWithdrawals: result.pendingWithdrawals,
      totalEarnings: result.totalEarnings,
      totalWithdrawn: result.totalWithdrawn,
      waitingEarnings: result.waitingEarnings,
    };
  }

  /**
   * Get seller's transaction history
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async getTransactions(
    @CurrentUser() user: UserDocument & { storeId?: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.balanceService.getSellerTransactions(user._id.toString(), page, limit);
  }

  /**
   * Get courier's transaction history
   */
  @Get('courier/transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('courier')
  async getCourierTransactions(
    @CurrentUser() user: UserDocument,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    // Uses same method since sellerId field stores courier ID for courier transactions
    return this.balanceService.getSellerTransactions(user._id.toString(), page, limit);
  }

  /**
   * Request withdrawal
   */
  @Post('withdraw')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async requestWithdrawal(
    @CurrentUser() user: UserDocument & { storeId?: string },
    @Body() body: { amount: number },
  ) {
    return this.balanceService.requestWithdrawal(
      user._id.toString(),
      user.storeId || '',
      body.amount,
    );
  }
}

