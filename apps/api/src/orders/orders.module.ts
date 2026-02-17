import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersEvents } from './orders.events';
import { PrismaModule } from 'apps/api/src/prisma/prisma.module';
import { CartModule } from 'apps/api/src/cart/cart.module';
import { UsersModule } from 'apps/api/src/users/users.module';
import { RabbitMQModule } from '@app/rabbitmq/rabbitmq.module';
import { PaymentsModule } from 'apps/api/src/payments/payments.module';

@Module({
  imports: [
    PrismaModule,
    CartModule,
    UsersModule,
    RabbitMQModule,
    PaymentsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersRepository,
    OrdersEvents,
  ],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
