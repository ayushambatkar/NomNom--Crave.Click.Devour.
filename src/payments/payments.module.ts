import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RabbitMQModule } from 'src/common/mq/rabbitmq.module';

@Module({
  imports: [PrismaModule, RabbitMQModule],
  providers: [
    PaymentsService,
    PaymentsRepository,
  ],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
