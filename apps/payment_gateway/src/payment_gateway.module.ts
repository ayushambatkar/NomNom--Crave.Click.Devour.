import { Module } from '@nestjs/common';
import { PaymentGatewayController } from './payment_gateway.controller';
import { PaymentGatewayService } from './payment_gateway.service';

@Module({
  imports: [],
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
