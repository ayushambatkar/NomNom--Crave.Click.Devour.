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
import { ConfigModule } from '@app/common/config/config.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { CartModule } from './cart/cart.module';
import { LoggerService } from '@app/common';
import { RedisModule } from '@app/redis';
import { OrdersModule } from './orders/orders.module';
import { RabbitMQModule } from '@app/rabbitmq';
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
