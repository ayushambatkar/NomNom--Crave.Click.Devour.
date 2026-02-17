import { Module } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { PrismaModule } from 'apps/api/src/prisma/prisma.module';
import { RestaurantRepository } from './restaurant.repository';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantsController],
  providers: [
    RestaurantsService,
    RestaurantRepository,
  ],
  exports: [
    RestaurantsService,
    RestaurantRepository,
  ],
})
export class RestaurantsModule {}
