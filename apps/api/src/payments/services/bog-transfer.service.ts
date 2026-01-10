import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// BOG Document Status Codes
// https://api.bog.ge/docs/en/bonline/result/document-statuses
const BOG_STATUS_MAP: Record<string, string> = {
  C: 'Cancelled by Response',
  N: 'Incomplete',
  D: 'Cancelled by Bank',
  P: 'Completed',
  A: 'To be Signed',
  S: 'Signed',
  T: 'In Progress',
  R: 'Rejected',
  Z: 'Sign In Progress',
};

export interface BogTransferRequest {
  beneficiaryAccountNumber: string; // Seller's IBAN
  beneficiaryInn: string; // Seller's ID number
  beneficiaryName: string; // Seller's name
  amount: number; // Amount in GEL
  nomination: string; // Transfer reason
  beneficiaryBankCode?: string; // RTGS code (default BAGAGE22 for BOG)
}

export interface BogTransferResponse {
  uniqueId: string;
  uniqueKey: number;
  resultCode: number;
  match?: number;
}

@Injectable()
export class BogTransferService {
  private readonly logger = new Logger(BogTransferService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly withdrawalClientId: string;
  private readonly withdrawalClientSecret: string;
  private readonly companyIban: string;
  private readonly apiUrl: string;
  private readonly redirectUri: string;

  // OAuth2 tokens (for admin panel - viewing only)
  private oauthAccessToken: string | null = null;
  private oauthTokenExpiry: Date | null = null;
  private oauthRefreshToken: string | null = null;
  private idToken: string | null = null;
  private userInfo: any = null;

  // Client credentials tokens (for withdrawal operations)
  private withdrawalAccessToken: string | null = null;
  private withdrawalTokenExpiry: Date | null = null;

  constructor(private configService: ConfigService) {
    this.clientId =
      this.configService.get<string>('BOG_BONLINE_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('BOG_BONLINE_CLIENT_SECRET') || '';
    this.withdrawalClientId =
      this.configService.get<string>('BOG_WITHDRAWAL_CLIENT_ID') || '';
    this.withdrawalClientSecret =
      this.configService.get<string>('BOG_WITHDRAWAL_CLIENT_SECRET') || '';
    this.companyIban =
      this.configService.get<string>('BOG_COMPANY_IBAN') || '';
    this.apiUrl =
      this.configService.get<string>('BOG_API_URL') ||
      'https://api.businessonline.ge/api';
    this.redirectUri =
      this.configService.get<string>('BOG_REDIRECT_URI') || '';
  }

  /**
   * Check if BOG Business Online is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  /**
   * Generate OAuth2 authorization URL for user login
   */
  getAuthorizationUrl(): string {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'BOG Business Online credentials are not configured',
      );
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'openid corp',
      redirect_uri: this.redirectUri,
      kc_locale: 'ka',
    });

    const authUrl = `https://account.bog.ge/auth/realms/bog/protocol/openid-connect/auth?${params.toString()}`;
    this.logger.log(`Generated authorization URL`);
    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    try {
      const authEndpoint =
        'https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token';
      this.logger.log('Exchanging authorization code for access token');

      const basicAuth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString('base64');

      const response = await axios.post(
        authEndpoint,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );

      this.oauthAccessToken = response.data.access_token;
      this.oauthRefreshToken = response.data.refresh_token;
      this.idToken = response.data.id_token;
      const expiresIn = response.data.expires_in || 3600;
      this.oauthTokenExpiry = new Date(Date.now() + expiresIn * 1000);

      this.logger.log('Successfully obtained OAuth2 access token');

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to exchange code for token');
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new BadRequestException(
        'Failed to obtain access token from authorization code',
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.oauthRefreshToken) {
      throw new BadRequestException(
        'No refresh token available. User needs to re-authorize.',
      );
    }

    try {
      const authEndpoint =
        'https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token';
      this.logger.log('Refreshing access token');

      const basicAuth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString('base64');

      const response = await axios.post(
        authEndpoint,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.oauthRefreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );

      this.oauthAccessToken = response.data.access_token;
      this.oauthRefreshToken = response.data.refresh_token;
      this.idToken = response.data.id_token;
      const expiresIn = response.data.expires_in || 3600;
      this.oauthTokenExpiry = new Date(Date.now() + expiresIn * 1000);

      this.logger.log('Successfully refreshed access token');
      return this.oauthAccessToken!;
    } catch (error) {
      this.logger.error('Failed to refresh access token');
      this.clearTokens();
      throw new BadRequestException('Session expired. Please re-authorize.');
    }
  }

  /**
   * Check if user is authenticated with OAuth2
   */
  isAuthenticated(): boolean {
    if (
      this.oauthAccessToken &&
      this.oauthTokenExpiry &&
      new Date() < this.oauthTokenExpiry
    ) {
      return true;
    }
    if (this.oauthRefreshToken) {
      return true;
    }
    return false;
  }

  /**
   * Clear all OAuth2 tokens (logout)
   */
  clearTokens(): void {
    this.oauthAccessToken = null;
    this.oauthRefreshToken = null;
    this.oauthTokenExpiry = null;
    this.idToken = null;
    this.withdrawalAccessToken = null;
    this.withdrawalTokenExpiry = null;
    this.userInfo = null;
    this.logger.log('OAuth2 tokens cleared');
  }

  /**
   * Get BOG user info from ID token
   */
  getUserInfo(): any {
    if (!this.idToken) {
      return null;
    }

    try {
      const parts = this.idToken.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      );

      return {
        name: 'BOG Business User',
        companyId: payload.company_client_id_cbs || 'N/A',
        userId: payload.sub,
      };
    } catch (error) {
      this.logger.error('Failed to get user info', error);
      return null;
    }
  }

  /**
   * Get access token (OAuth2 or client credentials)
   */
  private async getAccessToken(
    useWithdrawalCredentials = false,
  ): Promise<string> {
    if (useWithdrawalCredentials) {
      if (
        this.withdrawalAccessToken &&
        this.withdrawalTokenExpiry &&
        new Date() < this.withdrawalTokenExpiry
      ) {
        return this.withdrawalAccessToken;
      }
    } else {
      if (
        this.oauthAccessToken &&
        this.oauthTokenExpiry &&
        new Date() < this.oauthTokenExpiry
      ) {
        return this.oauthAccessToken;
      }

      if (this.oauthRefreshToken) {
        try {
          return await this.refreshAccessToken();
        } catch (error) {
          this.logger.warn(
            'OAuth refresh failed, falling back to client credentials',
          );
        }
      }
    }

    // Fall back to client credentials flow
    try {
      const clientId =
        useWithdrawalCredentials && this.withdrawalClientId
          ? this.withdrawalClientId
          : this.clientId;
      const clientSecret =
        useWithdrawalCredentials && this.withdrawalClientSecret
          ? this.withdrawalClientSecret
          : this.clientSecret;

      if (!clientId || !clientSecret) {
        throw new BadRequestException(
          'BOG Business Online credentials are not configured',
        );
      }

      const authEndpoint =
        'https://account.bog.ge/auth/realms/bog/protocol/openid-connect/token';
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );

      const response = await axios.post(
        authEndpoint,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );

      const accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      if (useWithdrawalCredentials) {
        this.withdrawalAccessToken = accessToken;
        this.withdrawalTokenExpiry = tokenExpiry;
      } else {
        this.oauthAccessToken = accessToken;
        this.oauthTokenExpiry = tokenExpiry;
      }

      return accessToken;
    } catch (error: any) {
      this.logger.error('Failed to get BOG access token');
      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }
      throw new BadRequestException('Failed to authenticate with BOG API');
    }
  }

  /**
   * Transfer money to seller's bank account
   */
  async transferToSeller(
    transferRequest: BogTransferRequest,
  ): Promise<BogTransferResponse> {
    const token = await this.getAccessToken(true);

    if (!transferRequest.beneficiaryAccountNumber.startsWith('GE')) {
      throw new BadRequestException('Invalid IBAN format. Must start with GE');
    }

    if (transferRequest.amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than 0');
    }

    const dispatchType = transferRequest.amount <= 10000 ? 'BULK' : 'MT103';

    const documentData = {
      Nomination: transferRequest.nomination,
      ValueDate: new Date().toISOString(),
      UniqueId: uuidv4(),
      Amount: transferRequest.amount,
      DocumentNo: `SI-${Date.now()}`, // ShopIt transaction number
      SourceAccountNumber: this.companyIban,
      BeneficiaryAccountNumber: transferRequest.beneficiaryAccountNumber,
      BeneficiaryBankCode: transferRequest.beneficiaryBankCode || 'BAGAGE22',
      BeneficiaryInn: transferRequest.beneficiaryInn,
      BeneficiaryName: transferRequest.beneficiaryName,
      DispatchType: dispatchType,
    };

    try {
      this.logger.log(
        `Initiating transfer of ${transferRequest.amount} GEL to ${transferRequest.beneficiaryAccountNumber}`,
      );

      const response = await axios.post(
        `${this.apiUrl}/documents/domestic`,
        [documentData],
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const result = response.data[0];

      if (!result) {
        throw new BadRequestException(
          'Bank API returned invalid response. Please contact support.',
        );
      }

      if (result.ResultCode !== 1 && result.ResultCode !== 0) {
        let errorMessage = result.Message;
        switch (result.ResultCode) {
          case 29:
            errorMessage =
              'Account number and ID number do not match. Please check your profile.';
            break;
          case 39:
          case 44:
          case 87:
            errorMessage = 'Invalid beneficiary account number. Please check IBAN.';
            break;
          case 41:
            errorMessage = 'Invalid beneficiary ID number.';
            break;
          case 333:
          case 444:
            errorMessage = 'Insufficient funds for transfer.';
            break;
          case 674:
            errorMessage = 'You do not have permission to transfer from this account.';
            break;
          default:
            errorMessage =
              errorMessage || `Transfer failed. Error code: ${result.ResultCode}`;
        }
        throw new BadRequestException(errorMessage);
      }

      this.logger.log(
        `Transfer successful. UniqueKey: ${result.UniqueKey}, Match: ${result.Match}%`,
      );

      return {
        uniqueId: result.UniqueId,
        uniqueKey: result.UniqueKey,
        resultCode: result.ResultCode,
        match: result.Match,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        'BOG transfer failed',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message ||
          error.message ||
          'Failed to process bank transfer. Please try again.',
      );
    }
  }

  /**
   * Sign a document with OTP
   */
  async signDocument(uniqueKey: number, otp: string): Promise<boolean> {
    const token = await this.getAccessToken();

    try {
      this.logger.log(`Signing document with UniqueKey: ${uniqueKey}`);

      const status = await this.getDocumentStatus(uniqueKey);
      if (status.Status !== 'A') {
        throw new BadRequestException(
          `Document cannot be signed. Current status: ${status.Status} (${this.getStatusText(status.Status)})`,
        );
      }

      const requestBody = {
        Otp: otp,
        ObjectKey: uniqueKey,
      };

      await axios.post(`${this.apiUrl}/sign/document`, requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Document signed successfully: ${uniqueKey}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to sign document ${uniqueKey}`);
      if (error.response) {
        const bogMessage =
          error.response.data?.Message || error.response.data?.message;
        let errorMessage = bogMessage;

        if (bogMessage?.includes('does not have sign permission')) {
          errorMessage =
            'API user does not have document signing permission. Please contact BOG.';
        } else if (bogMessage?.includes('Invalid OTP') || bogMessage?.includes('OTP')) {
          errorMessage = 'Invalid or expired OTP code. Please request a new one.';
        } else if (bogMessage?.includes('Document not found')) {
          errorMessage = 'Document not found in BOG system.';
        }

        throw new BadRequestException(
          errorMessage || 'Failed to sign document',
        );
      }
      throw new BadRequestException(
        error.message || 'Failed to sign document',
      );
    }
  }

  /**
   * Request OTP for document signing
   */
  async requestOtp(uniqueKey?: number): Promise<void> {
    const token = await this.getAccessToken();

    try {
      const requestBody = {
        ObjectKey: uniqueKey || 0,
        ObjectType: 0,
      };

      this.logger.log(`Requesting OTP for ObjectKey: ${requestBody.ObjectKey}`);

      await axios.post(`${this.apiUrl}/otp/request`, requestBody, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log('OTP requested successfully');
    } catch (error: any) {
      this.logger.error(
        'Failed to request OTP',
        error.response?.data || error.message,
      );
      throw new BadRequestException('Failed to request OTP');
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(): Promise<{
    accountNumber: string;
    availableBalance: number;
    currentBalance: number;
    currency: string;
  }> {
    const token = await this.getAccessToken();

    try {
      this.logger.log(`Fetching balance for account: ${this.companyIban}`);

      const response = await axios.get(
        `${this.apiUrl}/accounts/${this.companyIban}/GEL`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        accountNumber: this.companyIban,
        availableBalance: response.data.AvailableBalance,
        currentBalance: response.data.CurrentBalance,
        currency: 'GEL',
      };
    } catch (error: any) {
      this.logger.error(
        'Failed to get account balance',
        error.response?.data || error.message,
      );
      throw new BadRequestException('Failed to fetch account balance');
    }
  }

  /**
   * Get document status by UniqueKey
   */
  async getDocumentStatus(uniqueKey: number): Promise<any> {
    const token = await this.getAccessToken();

    try {
      this.logger.log(`Fetching status for document: ${uniqueKey}`);

      const response = await axios.get(
        `${this.apiUrl}/documents/statuses/${uniqueKey}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const status = Array.isArray(response.data)
        ? response.data[0]
        : response.data;
      return status;
    } catch (error: any) {
      this.logger.error(
        `Failed to get document status for ${uniqueKey}`,
        error.response?.data || error.message,
      );
      throw new BadRequestException('Failed to fetch document status');
    }
  }

  /**
   * Get multiple document statuses
   */
  async getDocumentStatuses(uniqueKeys: number[]): Promise<any[]> {
    if (!uniqueKeys || uniqueKeys.length === 0) {
      return [];
    }

    const token = await this.getAccessToken();

    try {
      const keysString = uniqueKeys.join(',');
      const response = await axios.get(
        `${this.apiUrl}/documents/statuses/${keysString}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get human-readable status text
   */
  getStatusText(statusCode: string): string {
    return BOG_STATUS_MAP[statusCode] || statusCode;
  }

  /**
   * Cancel a document
   */
  async cancelDocument(uniqueKey: number): Promise<boolean> {
    const token = await this.getAccessToken();

    try {
      this.logger.log(`Cancelling document with UniqueKey: ${uniqueKey}`);

      await axios.delete(`${this.apiUrl}/documents/${uniqueKey}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`Document ${uniqueKey} cancelled successfully`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to cancel document ${uniqueKey}`,
        error.response?.data || error.message,
      );

      if (error.response?.status === 400 || error.response?.status === 404) {
        return false;
      }

      throw new BadRequestException(
        `Failed to cancel document: ${error.response?.data?.message || error.message}`,
      );
    }
  }
}

