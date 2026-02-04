import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ServicePaymentService } from './service-payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BogWebhookGuard } from '../guards/bog-webhook.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { UserDocument } from '@shopit/api-database';

// BOG callback data structure
interface BogCallbackData {
  body?: {
    external_order_id?: string;
    order_id?: string;
    order_status?: {
      key?: string;
    };
    buyer?: {
      email?: string;
    };
  };
}

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly servicePaymentService: ServicePaymentService,
  ) {}

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
   *
   * SECURITY: Protected by BogWebhookGuard which:
   * - Verifies the request comes from BOG's IP addresses
   * - Validates the webhook signature (if BOG_WEBHOOK_SECRET is configured)
   */
  @Post('callback')
  @UseGuards(BogWebhookGuard)
  async handleCallback(@Body() callbackData: BogCallbackData) {
    this.logger.log('Received BOG callback:', JSON.stringify(callbackData));

    // Check if this is a service payment (external_order_id starts with 'svc_')
    const externalOrderId = callbackData?.body?.external_order_id;
    if (externalOrderId?.startsWith('svc_')) {
      this.logger.log('Processing service payment callback');
      const status = callbackData?.body?.order_status?.key?.toLowerCase();

      if (status === 'completed') {
        const paymentResult = {
          id: callbackData?.body?.order_id || externalOrderId,
          status: 'COMPLETED',
          updateTime: new Date().toISOString(),
          emailAddress: callbackData?.body?.buyer?.email,
        };
        return this.servicePaymentService.handleSuccessfulPayment(
          externalOrderId,
          paymentResult,
        );
      }
      return { success: false, message: 'Service payment not completed' };
    }

    // Regular order payment
    return this.paymentsService.handlePaymentCallback(callbackData);
  }

  /**
   * Retry payment for an existing pending order
   * Creates a new BOG payment for an order that failed or was abandoned
   */
  @Post('retry/:orderId')
  async retryPayment(
    @Param('orderId') orderId: string,
    @Body()
    body: {
      successUrl: string;
      failUrl: string;
    },
  ) {
    return this.paymentsService.retryPaymentForOrder(
      orderId,
      body.successUrl,
      body.failUrl,
    );
  }

  /**
   * Get order payment status (for polling)
   * Returns the current order status
   */
  @Get('order-status/:orderId')
  async getOrderPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getOrderPaymentStatus(orderId);
  }

  /**
   * Initiate subdomain change payment
   * Requires authentication
   */
  @Post('subdomain-change')
  @UseGuards(JwtAuthGuard)
  async initiateSubdomainChangePayment(
    @CurrentUser() user: UserDocument,
    @Body()
    body: {
      storeId: string;
      newSubdomain: string;
      successUrl: string;
      failUrl: string;
    },
  ) {
    return this.servicePaymentService.initiateSubdomainChangePayment(
      user._id.toString(),
      body.storeId,
      body.newSubdomain,
      body.successUrl,
      body.failUrl,
    );
  }
}
