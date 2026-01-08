import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from './common/config/config.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { CartModule } from './cart/cart.module';
import { LoggerService } from './common/logger/logger.service';
import { RedisModule } from './common/redis/redis.module';
import { OrdersModule } from './orders/orders.module';
import { RabbitMQModule } from './common/mq/rabbitmq.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UsersModule,
    PrismaModule,
    RestaurantsModule,
    CartModule,
    RedisModule,
    RabbitMQModule,
    OrdersModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerService).forRoutes('*');
  }
}
