import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

// Extended request type with rawBody for signature verification
interface WebhookRequest extends Request {
  rawBody?: string;
}

// BOG's public key for verifying callback signatures
// Source: https://api.bog.ge/docs/payments/standard-process/callback
const BOG_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----`;

/**
 * BOG Webhook Security Guard
 *
 * This guard protects BOG payment callback endpoints with RSA signature verification.
 * BOG signs callbacks with their private key using SHA256withRSA algorithm.
 * We verify using BOG's public key.
 *
 * Reference: https://api.bog.ge/docs/payments/standard-process/callback
 */
@Injectable()
export class BogWebhookGuard implements CanActivate {
  private readonly logger = new Logger(BogWebhookGuard.name);

  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WebhookRequest>();

    // Check if security is disabled (for development only)
    const skipWebhookSecurity = this.configService.get<string>(
      'BOG_SKIP_WEBHOOK_SECURITY',
    );
    if (skipWebhookSecurity === 'true') {
      this.logger.warn(
        '[SECURITY WARNING] BOG webhook security is DISABLED. This should only be used in development!',
      );
      return true;
    }

    // Verify RSA signature from BOG
    const isSignatureValid = this.verifySignature(request);
    if (!isSignatureValid) {
      this.logger.error('BOG Webhook rejected: Invalid signature');
      throw new ForbiddenException('Access denied: Invalid signature');
    }

    this.logger.log('BOG Webhook signature verified successfully');
    return true;
  }

  /**
   * Verify the webhook signature using RSA SHA256
   * BOG sends signature in 'Callback-Signature' header, signed with their private key.
   * We verify using BOG's public key.
   */
  private verifySignature(request: WebhookRequest): boolean {
    // BOG uses 'Callback-Signature' header
    const signatureHeader = request.headers['callback-signature'];

    if (!signatureHeader) {
      this.logger.warn(
        'No Callback-Signature header found in BOG webhook request',
      );
      return false;
    }

    // Ensure we have a string signature
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;

    try {
      // Get raw body for signature verification
      // IMPORTANT: Must use raw body before JSON parsing to preserve parameter order
      const rawBody = request.rawBody || JSON.stringify(request.body);

      // Verify signature using RSA SHA256 with BOG's public key
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(rawBody);
      verifier.end();

      // Signature from BOG is base64 encoded
      const isValid = verifier.verify(BOG_PUBLIC_KEY, signature, 'base64');

      if (!isValid) {
        this.logger.warn('BOG signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying BOG webhook signature:', error);
      return false;
    }
  }
}
