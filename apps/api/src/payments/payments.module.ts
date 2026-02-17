import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PaymentGatewayClient } from './payment-gateway.client';
import { PaymentWebhookController } from './payment-webhook.controller';
import { PrismaModule } from 'apps/api/src/prisma/prisma.module';
import { RabbitMQModule } from '@app/rabbitmq/rabbitmq.module';
import { CommonModule } from '@app/common';

@Module({
  imports: [PrismaModule, RabbitMQModule, CommonModule],
  controllers: [PaymentWebhookController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    PaymentGatewayClient,
  ],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
