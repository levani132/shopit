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

@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  /**
   * Get current seller's balance summary
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async getBalance(@CurrentUser() user: { id: string }) {
    const result = await this.balanceService.getSellerBalance(user.id);
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
   * Get seller's transaction history
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async getTransactions(
    @CurrentUser() user: { id: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.balanceService.getSellerTransactions(user.id, page, limit);
  }

  /**
   * Request withdrawal
   */
  @Post('withdraw')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async requestWithdrawal(
    @CurrentUser() user: { id: string; storeId: string },
    @Body() body: { amount: number },
  ) {
    return this.balanceService.requestWithdrawal(
      user.id,
      user.storeId,
      body.amount,
    );
  }
}

