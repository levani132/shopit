import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  ServicePayment,
  ServicePaymentDocument,
  ServiceType,
  ServicePaymentStatus,
  Store,
  StoreDocument,
} from '@shopit/api-database';

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

@Injectable()
export class ServicePaymentService {
  private readonly logger = new Logger(ServicePaymentService.name);

  constructor(
    @InjectModel(ServicePayment.name)
    private servicePaymentModel: Model<ServicePaymentDocument>,
    @InjectModel(Store.name)
    private storeModel: Model<StoreDocument>,
    private readonly configService: ConfigService,
  ) {}

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
    } catch (error: any) {
      this.logger.error('BOG Token Error:', error.message);
      throw error;
    }
  }

  /**
   * Initiate subdomain change payment
   */
  async initiateSubdomainChangePayment(
    userId: string,
    storeId: string,
    newSubdomain: string,
    successUrl: string,
    failUrl: string,
  ): Promise<{
    paymentId: string;
    redirectUrl: string;
    externalOrderId: string;
  }> {
    // Verify store ownership
    const store = await this.storeModel.findById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.ownerId.toString() !== userId) {
      throw new BadRequestException('You do not own this store');
    }

    // Check if subdomain change is free (first change)
    const changeCount = store.subdomainChangeCount || 0;
    if (changeCount === 0) {
      throw new BadRequestException('First subdomain change is free. No payment required.');
    }

    // Validate new subdomain format and availability
    const normalizedSubdomain = newSubdomain.toLowerCase().trim();
    if (normalizedSubdomain === store.subdomain) {
      throw new BadRequestException('New subdomain is the same as current');
    }

    // Check if subdomain is available
    const existingStore = await this.storeModel.findOne({ subdomain: normalizedSubdomain });
    if (existingStore) {
      throw new BadRequestException('This subdomain is already taken');
    }

    // Check for pending subdomain change payments for this store
    const pendingPayment = await this.servicePaymentModel.findOne({
      storeId: new Types.ObjectId(storeId),
      serviceType: ServiceType.SUBDOMAIN_CHANGE,
      status: ServicePaymentStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });

    if (pendingPayment) {
      // Return existing pending payment
      if (pendingPayment.metadata?.newSubdomain === normalizedSubdomain) {
        throw new BadRequestException(
          'You already have a pending payment for this subdomain change. Please complete or wait for it to expire.'
        );
      }
      // Cancel old pending payment if subdomain is different
      pendingPayment.status = ServicePaymentStatus.CANCELLED;
      await pendingPayment.save();
    }

    const amount = 10; // 10 GEL for subdomain change
    const externalOrderId = `svc_${uuidv4()}`;

    // Create service payment record
    const servicePayment = new this.servicePaymentModel({
      userId: new Types.ObjectId(userId),
      storeId: new Types.ObjectId(storeId),
      serviceType: ServiceType.SUBDOMAIN_CHANGE,
      amount,
      status: ServicePaymentStatus.PENDING,
      externalOrderId,
      metadata: {
        currentSubdomain: store.subdomain,
        newSubdomain: normalizedSubdomain,
      },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    await servicePayment.save();

    // Create BOG payment
    try {
      const token = await this.getToken();
      const callbackUrl = this.configService.get('BOG_CALLBACK_URL');

      const payload = {
        callback_url: callbackUrl,
        capture: 'automatic',
        external_order_id: externalOrderId,
        purchase_units: {
          currency: 'GEL',
          total_amount: amount,
          basket: [
            {
              quantity: 1,
              unit_price: amount,
              product_id: 'subdomain_change',
              description: `Subdomain change: ${store.subdomain} → ${normalizedSubdomain}`,
            },
          ],
        },
        payment_method: [
          'card',
          'google_pay',
          'apple_pay',
          'bog_loyalty',
          'bog_p2p',
        ],
        ttl: 15, // 15 minutes
        redirect_urls: {
          success: successUrl,
          fail: failUrl,
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

      // Update service payment with BOG order ID
      servicePayment.bogOrderId = response.data.id;
      await servicePayment.save();

      this.logger.log(
        `Subdomain change payment created: ${response.data.id}, External ID: ${externalOrderId}`,
      );

      return {
        paymentId: servicePayment._id.toString(),
        redirectUrl: response.data._links.redirect.href,
        externalOrderId,
      };
    } catch (error: any) {
      // Mark payment as failed
      servicePayment.status = ServicePaymentStatus.FAILED;
      await servicePayment.save();

      this.logger.error('BOG Service Payment Error:', error);

      if (error.response) {
        this.logger.error('BOG API Response:', error.response.data);
        throw new BadRequestException(
          error.response.data?.message || 'Payment service error',
        );
      }

      throw new BadRequestException(error.message || 'Payment service error');
    }
  }

  /**
   * Handle successful service payment (called from payment callback)
   */
  async handleSuccessfulPayment(
    externalOrderId: string,
    paymentResult: {
      id: string;
      status: string;
      updateTime: string;
      emailAddress?: string;
    },
  ): Promise<{ success: boolean; message: string; serviceType?: ServiceType }> {
    // Check if this is a service payment (starts with 'svc_')
    if (!externalOrderId.startsWith('svc_')) {
      return { success: false, message: 'Not a service payment' };
    }

    const servicePayment = await this.servicePaymentModel.findOne({
      externalOrderId,
    });

    if (!servicePayment) {
      this.logger.error(`Service payment not found: ${externalOrderId}`);
      return { success: false, message: 'Service payment not found' };
    }

    if (servicePayment.status === ServicePaymentStatus.COMPLETED) {
      this.logger.log(`Service payment already completed: ${externalOrderId}`);
      return { success: true, message: 'Already processed' };
    }

    // Update service payment status
    servicePayment.status = ServicePaymentStatus.COMPLETED;
    servicePayment.paymentResult = paymentResult;
    servicePayment.completedAt = new Date();
    await servicePayment.save();

    // Execute the service based on type
    switch (servicePayment.serviceType) {
      case ServiceType.SUBDOMAIN_CHANGE:
        return this.executeSubdomainChange(servicePayment);
      default:
        return { success: true, message: 'Payment completed', serviceType: servicePayment.serviceType };
    }
  }

  /**
   * Execute subdomain change after successful payment
   */
  private async executeSubdomainChange(
    servicePayment: ServicePaymentDocument,
  ): Promise<{ success: boolean; message: string; serviceType: ServiceType }> {
    const { storeId, metadata } = servicePayment;
    const newSubdomain = metadata?.newSubdomain;

    if (!storeId || !newSubdomain) {
      this.logger.error('Missing store ID or new subdomain in service payment');
      return {
        success: false,
        message: 'Invalid service payment data',
        serviceType: ServiceType.SUBDOMAIN_CHANGE,
      };
    }

    // Check if subdomain is still available
    const existingStore = await this.storeModel.findOne({
      subdomain: newSubdomain,
      _id: { $ne: storeId },
    });

    if (existingStore) {
      this.logger.error(`Subdomain ${newSubdomain} is no longer available`);
      // TODO: Handle refund scenario
      return {
        success: false,
        message: 'Subdomain is no longer available. Please contact support for a refund.',
        serviceType: ServiceType.SUBDOMAIN_CHANGE,
      };
    }

    // Update store subdomain
    const store = await this.storeModel.findById(storeId);
    if (!store) {
      return {
        success: false,
        message: 'Store not found',
        serviceType: ServiceType.SUBDOMAIN_CHANGE,
      };
    }

    const oldSubdomain = store.subdomain;
    store.subdomain = newSubdomain;
    store.subdomainChangeCount = (store.subdomainChangeCount || 0) + 1;
    await store.save();

    this.logger.log(
      `Subdomain changed: ${oldSubdomain} → ${newSubdomain} for store ${storeId}`,
    );

    return {
      success: true,
      message: `Subdomain successfully changed to ${newSubdomain}`,
      serviceType: ServiceType.SUBDOMAIN_CHANGE,
    };
  }

  /**
   * Get pending subdomain change payment for a store
   */
  async getPendingSubdomainChange(storeId: string): Promise<ServicePaymentDocument | null> {
    return this.servicePaymentModel.findOne({
      storeId: new Types.ObjectId(storeId),
      serviceType: ServiceType.SUBDOMAIN_CHANGE,
      status: ServicePaymentStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * Get service payment by external order ID
   */
  async getByExternalOrderId(externalOrderId: string): Promise<ServicePaymentDocument | null> {
    return this.servicePaymentModel.findOne({ externalOrderId });
  }
}

