import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersEvents } from './orders.events';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CartModule } from 'src/cart/cart.module';
import { UsersModule } from 'src/users/users.module';
import { RabbitMQModule } from 'src/common/mq/rabbitmq.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [
    PrismaModule,
    CartModule,
    UsersModule,
    RabbitMQModule,
    PaymentsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, OrdersEvents],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
