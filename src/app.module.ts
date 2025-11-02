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
import { ConfigModule } from '@nestjs/config';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { CartModule } from './cart/cart.module';
import { LoggerService } from './logger/logger.service';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PrismaModule,
    RestaurantsModule,
    CartModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [AppController],
  providers: [AppService, LoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerService).forRoutes('*');
  }
}
