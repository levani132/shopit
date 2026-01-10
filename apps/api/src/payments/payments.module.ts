import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { BogAdminController } from './controllers/bog-admin.controller';
import { BogTransferService } from './services/bog-transfer.service';
import { ServicePaymentService } from './service-payment.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [ConfigModule, forwardRef(() => OrdersModule)],
  controllers: [PaymentsController, BogAdminController],
  providers: [PaymentsService, BogTransferService, ServicePaymentService],
  exports: [PaymentsService, BogTransferService, ServicePaymentService],
})
export class PaymentsModule {}

