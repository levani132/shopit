import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { OrdersService } from '../orders/orders.service';

interface BogTokenResponse {
  access_token: string;
}

interface BogPaymentResponse {
  id: string;
  _links: {
    redirect: {
      href: string;
    };
  };
}

interface BogCallbackData {
  body: {
    external_order_id: string;
    order_status: { key: string };
    order_id: string;
  };
}

interface BogPaymentStatus {
  order_status?: { key?: string };
  buyer?: { email?: string };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Check if payment should be skipped (for dev/test environments)
   * By default, SKIP_PAYMENT is false, meaning real payments are required.
   * Set SKIP_PAYMENT=true to simulate payments without actual BOG processing.
   */
  private isPaymentSkipped(): boolean {
    const skipPayment = this.configService.get<string>('SKIP_PAYMENT');
    return skipPayment === 'true';
  }

  /**
   * Get BOG access token
   */
  private async getToken(): Promise<string> {
    try {
      const clientId = this.configService.get<string>('BOG_CLIENT_ID');
      const clientSecret = this.configService.get<string>('BOG_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('BOG credentials are not configured');
      }

      const response = await axios.post<BogTokenResponse>(
        'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:
              'Basic ' +
              Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          },
        },
      );

      return response.data.access_token;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('BOG Token Error:', message);
      throw error;
    }
  }

  /**
   * Create a payment request with BOG
   */
  async createPayment(data: {
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
  }): Promise<{
    orderId: string;
    bogOrderId: string;
    redirectUrl: string;
    externalOrderId: string;
  }> {
    const externalOrderId = uuidv4();

    // If SKIP_PAYMENT is enabled, simulate successful payment immediately
    if (this.isPaymentSkipped()) {
      this.logger.warn(
        `[DEV MODE] SKIP_PAYMENT is enabled - simulating payment for order ${data.orderId}`,
      );

      // Update order with external order ID
      await this.ordersService.updateExternalOrderId(
        data.orderId,
        externalOrderId,
      );

      // Immediately mark order as paid
      const paymentResult = {
        id: `simulated_${externalOrderId}`,
        status: 'COMPLETED',
        updateTime: new Date().toISOString(),
        emailAddress: data.customer?.email || 'simulated@dev.local',
      };

      await this.ordersService.markAsPaidByExternalId(
        externalOrderId,
        paymentResult,
      );

      this.logger.log(
        `[DEV MODE] Order ${data.orderId} automatically marked as paid`,
      );

      // Return a fake redirect URL that goes directly to success page
      const baseUrl =
        this.configService.get('CORS_ORIGIN') || 'https://shopit.ge';
      const successUrl = data.successUrl || `${baseUrl}/checkout/success`;

      return {
        orderId: data.orderId,
        bogOrderId: `simulated_${uuidv4()}`,
        redirectUrl: successUrl,
        externalOrderId,
      };
    }

    try {
      const token = await this.getToken();

      // Build basket items
      const basket = data.items.map((item) => ({
        quantity: item.quantity,
        unit_price: item.price,
        product_id: item.productId,
        description: item.name,
      }));

      const callbackUrl = this.configService.get('BOG_CALLBACK_URL');
      const baseUrl =
        this.configService.get('CORS_ORIGIN') || 'https://shopit.ge';

      const payload = {
        callback_url: callbackUrl,
        capture: 'automatic',
        external_order_id: externalOrderId,
        purchase_units: {
          currency: 'GEL',
          total_amount: data.totalPrice,
          basket,
        },
        payment_method: [
          'card',
          'google_pay',
          'apple_pay',
          'bog_loyalty',
          'bog_p2p',
        ],
        ttl: 10, // 10 minutes
        redirect_urls: {
          success: data.successUrl || `${baseUrl}/checkout/success`,
          fail: data.failUrl || `${baseUrl}/checkout/fail`,
        },
      };

      const response = await axios.post<BogPaymentResponse>(
        'https://api.bog.ge/payments/v1/ecommerce/orders',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'Accept-Language': 'ka',
            'Idempotency-Key': uuidv4(),
          },
        },
      );

      this.logger.log(
        `BOG Payment Created: ${response.data.id}, External ID: ${externalOrderId}`,
      );

      // Update order with external order ID
      await this.ordersService.updateExternalOrderId(
        data.orderId,
        externalOrderId,
      );

      return {
        orderId: data.orderId,
        bogOrderId: response.data.id,
        redirectUrl: response.data._links.redirect.href,
        externalOrderId,
      };
    } catch (error: unknown) {
      this.logger.error('BOG Service Error:', error);

      if (axios.isAxiosError(error) && error.response) {
        this.logger.error('BOG API Response:', error.response.data);
        this.logger.error('BOG API Status:', error.response.status);

        if (error.response.status === 401) {
          throw new Error('BOG API authentication failed');
        } else if (error.response.status === 400) {
          throw new Error(
            'Invalid payment data: ' +
              ((error.response.data as { message?: string })?.message ||
                'Bad request'),
          );
        } else if (error.response.status >= 500) {
          throw new Error(
            'BOG service is temporarily unavailable. Please try again later.',
          );
        }
      }

      throw new Error((error as Error).message || 'Payment service error');
    }
  }

  /**
   * Get payment status from BOG
   */
  async getPaymentStatus(bogOrderId: string): Promise<BogPaymentStatus> {
    const token = await this.getToken();
    const response = await axios.get(
      `https://api.bog.ge/payments/v1/receipt/${bogOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  }

  /**
   * Handle BOG payment callback
   */
  async handlePaymentCallback(
    callbackData: BogCallbackData,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(
        'BOG Payment Callback received:',
        JSON.stringify(callbackData, null, 2),
      );

      const {
        external_order_id,
        order_status: { key: status },
        order_id,
      } = callbackData.body;

      if (!external_order_id && !order_id) {
        this.logger.log('No order identifier found in callback data');
        return { success: false, message: 'No order identifier found' };
      }

      this.logger.log(
        `Processing payment for external_order_id: ${external_order_id}, order_id: ${order_id}, status: ${status}`,
      );

      // SECURITY: Always verify payment status with BOG API
      // Never trust callback data alone - a hacker could forge callbacks
      let paymentStatus: BogPaymentStatus | undefined;
      try {
        if (!order_id) {
          this.logger.error(
            'SECURITY: No order_id in callback - cannot verify with BOG API',
          );
          return {
            success: false,
            message: 'Cannot verify payment: missing order_id',
          };
        }

        this.logger.log(`Fetching payment status for order_id: ${order_id}`);
        paymentStatus = await this.getPaymentStatus(order_id);
        this.logger.log(
          'Payment status from BOG API:',
          JSON.stringify(paymentStatus, null, 2),
        );
      } catch (error: unknown) {
        // SECURITY: If we can't verify with BOG API, reject the callback
        // Never fall back to trusting the callback data
        this.logger.error(
          'SECURITY: Failed to verify payment with BOG API - rejecting callback:',
          (error as Error).message,
        );
        return {
          success: false,
          message: 'Cannot verify payment status with payment provider',
        };
      }

      // BOG returns order_status.key = "completed"
      // SECURITY: Only use the verified status from BOG API, not callback data
      const statusKey = paymentStatus?.order_status?.key?.toLowerCase();

      const isPaymentSuccessful = statusKey === 'completed';

      this.logger.log(
        `Payment successful: ${isPaymentSuccessful}, external_order_id: ${external_order_id}, statusKey: ${statusKey}`,
      );

      if (isPaymentSuccessful && external_order_id) {
        try {
          const paymentResult = {
            id: order_id || external_order_id,
            status: 'COMPLETED',
            updateTime: new Date().toISOString(),
            emailAddress: paymentStatus?.buyer?.email || 'unknown@unknown.com',
          };

          await this.ordersService.markAsPaidByExternalId(
            external_order_id,
            paymentResult,
          );

          this.logger.log(
            `Order ${external_order_id} successfully updated with payment status`,
          );

          return {
            success: true,
            message: 'Payment processed successfully and order updated',
          };
        } catch (error: unknown) {
          this.logger.error(
            'Error updating order with payment result:',
            (error as Error).message,
          );
          return {
            success: false,
            message:
              'Payment successful but failed to update order: ' +
              (error as Error).message,
          };
        }
      } else {
        this.logger.log(
          'Payment was not successful or external_order_id is missing',
        );
        return {
          success: false,
          message: 'Payment was not successful',
        };
      }
    } catch (error: unknown) {
      this.logger.error(
        'Error processing payment callback:',
        (error as Error).message,
      );
      return {
        success: false,
        message:
          'Error processing payment callback: ' + (error as Error).message,
      };
    }
  }

  /**
   * Retry payment for an existing pending order
   */
  async retryPaymentForOrder(
    orderId: string,
    successUrl: string,
    failUrl: string,
  ): Promise<{
    orderId: string;
    bogOrderId: string;
    redirectUrl: string;
    externalOrderId: string;
  }> {
    // Get the order
    const order = await this.ordersService.findById(orderId);

    // Validate order is in pending state
    if (order.isPaid) {
      throw new Error('Order is already paid');
    }

    if (order.status === 'cancelled') {
      throw new Error('Cannot pay for a cancelled order');
    }

    // Build payment items from order
    const items = order.orderItems.map((item) => ({
      productId: item.productId.toString(),
      name: item.name,
      quantity: item.qty,
      price: item.price,
    }));

    // Get customer info from order
    const customer = order.user
      ? undefined // Will be fetched from user if needed
      : order.guestInfo
        ? {
            firstName: order.guestInfo.fullName.split(' ')[0],
            lastName: order.guestInfo.fullName.split(' ').slice(1).join(' '),
            email: order.guestInfo.email,
            phone: order.guestInfo.phoneNumber,
          }
        : undefined;

    // Create new BOG payment
    return this.createPayment({
      orderId,
      totalPrice: order.totalPrice,
      items,
      customer,
      successUrl,
      failUrl,
    });
  }

  /**
   * Get order payment status (for polling from frontend)
   */
  async getOrderPaymentStatus(orderId: string): Promise<{
    orderId: string;
    status: string;
    isPaid: boolean;
    paidAt?: string;
  }> {
    const order = await this.ordersService.findById(orderId);
    return {
      orderId: order._id.toString(),
      status: order.status,
      isPaid: order.isPaid,
      paidAt: order.paidAt?.toISOString(),
    };
  }
}
