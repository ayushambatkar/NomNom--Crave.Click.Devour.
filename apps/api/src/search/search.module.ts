import {
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchRegistry } from './search.registry';
import {
  RestaurantSearchStrategy,
  MenuSearchStrategy,
} from './strategies';
import { PrismaModule } from 'apps/api/src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchRegistry,
    RestaurantSearchStrategy,
    MenuSearchStrategy,
  ],
  exports: [SearchService, SearchRegistry],
})
export class SearchModule
  implements OnModuleInit
{
  constructor(
    private readonly registry: SearchRegistry,
    private readonly restaurantStrategy: RestaurantSearchStrategy,
    private readonly menuStrategy: MenuSearchStrategy,
  ) {}

  onModuleInit() {
    // Register all search strategies on module initialization
    this.registry.register(
      this.restaurantStrategy,
    );
    this.registry.register(this.menuStrategy);
  }
}
