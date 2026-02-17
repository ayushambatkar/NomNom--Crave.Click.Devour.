import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PrismaModule } from 'apps/api/src/prisma/prisma.module';
import { RabbitMQModule } from '@app/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, RabbitMQModule],
  providers: [
    PaymentsService,
    PaymentsRepository,
  ],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
