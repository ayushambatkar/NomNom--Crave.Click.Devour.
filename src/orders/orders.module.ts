import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CartModule } from 'src/cart/cart.module';
import { UsersModule } from 'src/users/users.module';
import { RabbitMQModule } from 'src/common/mq/rabbitmq.module';
import { OrdersEvents } from './orders.events';

@Module({
  imports: [PrismaModule, CartModule, UsersModule, RabbitMQModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersEvents],
  exports: [OrdersService],
})
export class OrdersModule {}
