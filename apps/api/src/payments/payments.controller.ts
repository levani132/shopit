import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initiate payment for an order
   * Can be called by authenticated users or for guest orders
   */
  @Post('initiate')
  async initiatePayment(
    @Body()
    body: {
      orderId: string;
      totalPrice: number;
      items: Array<{
        productId: string;
        name: string;
        quantity: number;
        price: number;
      }>;
      customer?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      };
      successUrl?: string;
      failUrl?: string;
    },
  ) {
    return this.paymentsService.createPayment(body);
  }

  /**
   * Get payment status
   */
  @Get('status/:bogOrderId')
  async getPaymentStatus(@Param('bogOrderId') bogOrderId: string) {
    return this.paymentsService.getPaymentStatus(bogOrderId);
  }

  /**
   * BOG Payment callback (webhook)
   * This is called by BOG when payment status changes
   */
  @Post('callback')
  async handleCallback(@Body() callbackData: any) {
    this.logger.log('Received BOG callback:', JSON.stringify(callbackData));
    return this.paymentsService.handlePaymentCallback(callbackData);
  }
}

