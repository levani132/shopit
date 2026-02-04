import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { OrderDocument, StoreDocument } from '@shopit/api-database';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP configuration missing - email notifications disabled',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: port || 587,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log('Email transporter initialized');
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not configured, skipping email');
      return false;
    }

    try {
      const from =
        this.configService.get<string>('SMTP_FROM') ||
        this.configService.get<string>('SMTP_USER');

      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Send order confirmation email to buyer
   */
  async sendBuyerOrderConfirmation(
    order: OrderDocument,
    buyerEmail: string,
    buyerName: string,
  ): Promise<boolean> {
    const orderNumber = order._id.toString().slice(-8).toUpperCase();

    // Calculate estimated delivery
    let deliveryInfo = '';
    if (order.deliveryMethod === 'pickup') {
      deliveryInfo = `
        <p><strong>მიტანის მეთოდი:</strong> თვითგატანა</p>
        <p><strong>მისამართი:</strong> ${order.pickupAddress || 'მაღაზიიდან აიღეთ'}</p>
      `;
    } else {
      const maxDeliveryDays = Math.max(
        ...order.orderItems.map(
          (item) => (item.prepTimeMaxDays || 0) + (item.deliveryMaxDays || 3),
        ),
      );
      deliveryInfo = `
        <p><strong>მიტანის მისამართი:</strong> ${order.shippingDetails?.address || ''}, ${order.shippingDetails?.city || ''}</p>
        <p><strong>სავარაუდო მიტანა:</strong> ${maxDeliveryDays} დღეში</p>
      `;
    }

    // Build items list
    const itemsList = order.orderItems
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name}
          ${item.variantAttributes?.length ? `<br/><small style="color: #666;">${item.variantAttributes.map((a) => a.value).join(', ')}</small>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(item.price * item.qty).toFixed(2)} ₾</td>
      </tr>
    `,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>შეკვეთის დადასტურება</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">✓ მადლობა შეძენისთვის!</h1>
          </div>
          
          <p>გამარჯობა ${buyerName},</p>
          <p>თქვენი შეკვეთა წარმატებით გაფორმდა.</p>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;"><strong>შეკვეთის ნომერი:</strong> #${orderNumber}</p>
            ${deliveryInfo}
          </div>
          
          <h3>შეკვეთილი პროდუქტები:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left;"></th>
                <th style="padding: 10px; text-align: left;">პროდუქტი</th>
                <th style="padding: 10px; text-align: center;">რაოდენობა</th>
                <th style="padding: 10px; text-align: right;">ფასი</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right;"><strong>ჯამი:</strong></td>
                <td style="padding: 10px; text-align: right;"><strong>${order.itemsPrice.toFixed(2)} ₾</strong></td>
              </tr>
              ${
                order.shippingPrice > 0
                  ? `
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right;">მიტანა:</td>
                <td style="padding: 10px; text-align: right;">${order.shippingPrice.toFixed(2)} ₾</td>
              </tr>
              `
                  : ''
              }
              <tr style="background-color: #10b981; color: white;">
                <td colspan="3" style="padding: 15px; text-align: right; font-size: 18px;"><strong>სულ:</strong></td>
                <td style="padding: 15px; text-align: right; font-size: 18px;"><strong>${order.totalPrice.toFixed(2)} ₾</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666;">
            <p>თუ გაქვთ შეკითხვები, დაგვიკავშირდით.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              ეს ავტომატური შეტყობინებაა ShopIt-დან
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: buyerEmail,
      subject: `შეკვეთის დადასტურება #${orderNumber}`,
      html,
    });
  }

  /**
   * Send new order notification to seller
   */
  async sendSellerNewOrderNotification(
    order: OrderDocument,
    store: StoreDocument,
    sellerEmail: string,
  ): Promise<boolean> {
    const orderNumber = order._id.toString().slice(-8).toUpperCase();

    // Filter items for this store
    const storeItems = order.orderItems.filter(
      (item) => item.storeId.toString() === store._id.toString(),
    );

    const storeTotal = storeItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );

    // Build items list
    const itemsList = storeItems
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name}
          ${item.variantAttributes?.length ? `<br/><small style="color: #666;">${item.variantAttributes.map((a) => a.value).join(', ')}</small>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(item.price * item.qty).toFixed(2)} ₾</td>
      </tr>
    `,
      )
      .join('');

    // Shipping info
    let shippingInfo = '';
    if (order.deliveryMethod === 'pickup') {
      shippingInfo =
        '<p><strong>მომხმარებელი თვითონ წამოიღებს პროდუქტს</strong></p>';
    } else {
      shippingInfo = `
        <p><strong>მიტანის მისამართი:</strong></p>
        <p>${order.recipientName || ''}<br/>
        ${order.shippingDetails?.phoneNumber || ''}<br/>
        ${order.shippingDetails?.address || ''}, ${order.shippingDetails?.city || ''}</p>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ახალი შეკვეთა</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b; margin: 0;">🛒 ახალი შეკვეთა!</h1>
          </div>
          
          <p>გამარჯობა,</p>
          <p>თქვენს მაღაზიაში <strong>${store.name}</strong> ახალი შეკვეთა შემოვიდა.</p>
          
          <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 18px;"><strong>შეკვეთის ნომერი:</strong> #${orderNumber}</p>
            <p style="margin: 10px 0 0 0;"><strong>გთხოვთ გაამზადოთ შეკვეთა!</strong></p>
          </div>

          ${shippingInfo}
          
          <h3>შეკვეთილი პროდუქტები:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left;"></th>
                <th style="padding: 10px; text-align: left;">პროდუქტი</th>
                <th style="padding: 10px; text-align: center;">რაოდენობა</th>
                <th style="padding: 10px; text-align: right;">ფასი</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr style="background-color: #f59e0b; color: white;">
                <td colspan="3" style="padding: 15px; text-align: right; font-size: 18px;"><strong>თქვენი შემოსავალი:</strong></td>
                <td style="padding: 15px; text-align: right; font-size: 18px;"><strong>${storeTotal.toFixed(2)} ₾</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.configService.get('CORS_ORIGIN')}/dashboard/orders" 
               style="display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              შეკვეთების ნახვა
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>ეს ავტომატური შეტყობინებაა ShopIt-დან</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: sellerEmail,
      subject: `🛒 ახალი შეკვეთა #${orderNumber} - ${store.name}`,
      html,
    });
  }

  /**
   * Send new order notification to admin
   */
  async sendAdminOrderNotification(
    order: OrderDocument,
    adminEmail: string,
  ): Promise<boolean> {
    const orderNumber = order._id.toString().slice(-8).toUpperCase();

    // Get unique stores from order
    const storeNames = [
      ...new Set(order.orderItems.map((item) => item.storeName)),
    ];

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ახალი შეკვეთა - ადმინ</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">📊 ახალი შეკვეთა სისტემაში</h1>
          </div>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;"><strong>შეკვეთის ნომერი:</strong> #${orderNumber}</p>
            <p style="margin: 10px 0;"><strong>ჯამი:</strong> ${order.totalPrice.toFixed(2)} ₾</p>
            <p style="margin: 10px 0;"><strong>მაღაზიები:</strong> ${storeNames.join(', ')}</p>
            <p style="margin: 10px 0;"><strong>პროდუქტები:</strong> ${order.orderItems.length} ცალი</p>
            <p style="margin: 10px 0;"><strong>მიტანა:</strong> ${order.deliveryMethod === 'pickup' ? 'თვითგატანა' : 'მიტანით'}</p>
          </div>
          
          ${
            order.shippingDetails
              ? `
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;">
            <p style="margin: 0;"><strong>მისამართი:</strong> ${order.shippingDetails.address}, ${order.shippingDetails.city}</p>
            <p style="margin: 5px 0;"><strong>ტელეფონი:</strong> ${order.shippingDetails.phoneNumber || ''}</p>
          </div>
          `
              : ''
          }
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.configService.get('CORS_ORIGIN')}/dashboard/admin" 
               style="display: inline-block; background-color: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              ადმინ პანელი
            </a>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `📊 ახალი შეკვეთა #${orderNumber} - ${order.totalPrice.toFixed(2)} ₾`,
      html,
    });
  }

  /**
   * Send delivery confirmation email to buyer
   */
  async sendDeliveryConfirmation(
    order: OrderDocument,
    buyerEmail: string,
    buyerName: string,
  ): Promise<boolean> {
    const orderNumber = order._id.toString().slice(-8).toUpperCase();

    // Build items list with images
    const itemsList = order.orderItems
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.name}</strong>
          ${item.variantAttributes?.length ? `<br/><small style="color: #666;">${item.variantAttributes.map((a) => a.value).join(', ')}</small>` : ''}
          <br/><small style="color: #888;">x${item.qty}</small>
        </td>
      </tr>
    `,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>შეკვეთა მიტანილია</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 60px; margin-bottom: 10px;">📦✅</div>
            <h1 style="color: #10b981; margin: 0;">შეკვეთა მიტანილია!</h1>
          </div>
          
          <p>გამარჯობა ${buyerName},</p>
          <p>თქვენი შეკვეთა <strong>#${orderNumber}</strong> წარმატებით მიტანილია!</p>
          
          <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 16px;">გმადლობთ რომ ShopIt-ით ისარგებლეთ! 🎉</p>
          </div>
          
          <h3>მიტანილი პროდუქტები:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${itemsList}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.configService.get('CORS_ORIGIN')}/dashboard/my-orders" 
               style="display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              ჩემი შეკვეთები
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666;">
            <p>თუ გაქვთ შეკითხვები ან პრობლემა, დაგვიკავშირდით.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              ეს ავტომატური შეტყობინებაა ShopIt-დან
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: buyerEmail,
      subject: `📦 შეკვეთა #${orderNumber} მიტანილია!`,
      html,
    });
  }

  /**
   * Send withdrawal request pending notification to seller
   */
  async sendWithdrawalPendingNotification(
    sellerEmail: string,
    sellerName: string,
    amount: number,
    withdrawalId: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>თანხის გატანის მოთხოვნა მიღებულია</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 60px; margin-bottom: 10px;">💰</div>
            <h1 style="color: #f59e0b; margin: 0;">თანხის გატანის მოთხოვნა</h1>
          </div>
          
          <p>გამარჯობა ${sellerName},</p>
          <p>თქვენი თანხის გატანის მოთხოვნა მიღებულია და მუშავდება.</p>
          
          <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; text-align: center;">${amount.toFixed(2)} ₾</p>
            <p style="margin: 10px 0 0 0; text-align: center; color: #92400e;">მოთხოვნის ID: ${withdrawalId}</p>
          </div>
          
          <p style="color: #666;">თანხა გადმოგერიცხებათ 1-3 სამუშაო დღეში.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.configService.get('CORS_ORIGIN')}/dashboard/balance" 
               style="display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              ბალანსის ნახვა
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>ეს ავტომატური შეტყობინებაა ShopIt-დან</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: sellerEmail,
      subject: `💰 თანხის გატანის მოთხოვნა მიღებულია - ${amount.toFixed(2)} ₾`,
      html,
    });
  }

  /**
   * Send withdrawal completed notification to seller
   */
  async sendWithdrawalCompletedNotification(
    sellerEmail: string,
    sellerName: string,
    amount: number,
    withdrawalId: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>თანხა გადმორიცხულია</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 60px; margin-bottom: 10px;">✅💰</div>
            <h1 style="color: #10b981; margin: 0;">თანხა გადმორიცხულია!</h1>
          </div>
          
          <p>გამარჯობა ${sellerName},</p>
          <p>თქვენი თანხა წარმატებით გადმოირიცხა თქვენს საბანკო ანგარიშზე.</p>
          
          <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; text-align: center; color: #10b981;">${amount.toFixed(2)} ₾</p>
            <p style="margin: 10px 0 0 0; text-align: center; color: #065f46;">მოთხოვნის ID: ${withdrawalId}</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.configService.get('CORS_ORIGIN')}/dashboard/balance" 
               style="display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              ბალანსის ნახვა
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>გმადლობთ ShopIt-ით სარგებლობისთვის!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: sellerEmail,
      subject: `✅ თანხა გადმორიცხულია - ${amount.toFixed(2)} ₾`,
      html,
    });
  }

  /**
   * Send withdrawal rejected notification to seller
   */
  async sendWithdrawalRejectedNotification(
    sellerEmail: string,
    sellerName: string,
    amount: number,
    reason: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>თანხის გატანა უარყოფილია</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 60px; margin-bottom: 10px;">❌</div>
            <h1 style="color: #ef4444; margin: 0;">თანხის გატანა უარყოფილია</h1>
          </div>
          
          <p>გამარჯობა ${sellerName},</p>
          <p>სამწუხაროდ, თქვენი თანხის გატანის მოთხოვნა უარყოფილია.</p>
          
          <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0;"><strong>თანხა:</strong> ${amount.toFixed(2)} ₾</p>
            <p style="margin: 10px 0 0 0;"><strong>მიზეზი:</strong> ${reason}</p>
          </div>
          
          <p style="color: #666;">თანხა დაბრუნებულია თქვენს ბალანსზე. თუ გაქვთ შეკითხვები, დაგვიკავშირდით.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.configService.get('CORS_ORIGIN')}/dashboard/balance" 
               style="display: inline-block; background-color: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              ბალანსის ნახვა
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>ეს ავტომატური შეტყობინებაა ShopIt-დან</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: sellerEmail,
      subject: `❌ თანხის გატანა უარყოფილია`,
      html,
    });
  }

  /**
   * Send withdrawal request notification to admin
   */
  async sendWithdrawalAdminNotification(
    adminEmail: string,
    sellerName: string,
    sellerEmail: string,
    amount: number,
    iban: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>ახალი თანხის გატანის მოთხოვნა</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b; margin: 0;">💰 ახალი თანხის გატანის მოთხოვნა</h1>
          </div>
          
          <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; text-align: center;">${amount.toFixed(2)} ₾</p>
          </div>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;"><strong>გამყიდველი:</strong> ${sellerName}</p>
            <p style="margin: 10px 0;"><strong>ემაილი:</strong> ${sellerEmail}</p>
            <p style="margin: 10px 0 0 0;"><strong>IBAN:</strong> ${iban}</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.configService.get('CORS_ORIGIN')}/dashboard/admin" 
               style="display: inline-block; background-color: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              ადმინ პანელი
            </a>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `💰 თანხის გატანის მოთხოვნა - ${sellerName} - ${amount.toFixed(2)} ₾`,
      html,
    });
  }

  /**
   * Send contact form email to admin
   */
  async sendContactFormEmail(
    adminEmail: string,
    name: string,
    email: string,
    subject: string,
    message: string,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>კონტაქტ ფორმა</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">📧 ახალი შეტყობინება</h1>
          </div>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;"><strong>სახელი:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>ემაილი:</strong> <a href="mailto:${email}">${email}</a></p>
            <p style="margin: 10px 0 0 0;"><strong>თემა:</strong> ${subject}</p>
          </div>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="mailto:${email}?subject=Re: ${subject}" 
               style="display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              პასუხის გაცემა
            </a>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `📧 კონტაქტ ფორმა: ${subject}`,
      html,
    });
  }
}
