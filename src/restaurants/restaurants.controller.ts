import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto, CreateMenuItemDto, NearbyQueryDto, UpdateRestaurantDto } from './types';
import { SnakeBody } from 'src/common/decorators/snake-body.decorator';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private service: RestaurantsService) {}

  @Post()
  create(@SnakeBody(CreateRestaurantDto) dto: CreateRestaurantDto) {
    return this.service.create(dto);
  }

  @Get()
  list() {
    return this.service.list();
  }

  // Define static route before dynamic ':id' to avoid matching 'nearby' as an id
  @Get('nearby')
  nearby(@Query() query: NearbyQueryDto) {
    const radiusKm = query.radiusKm ?? 5;
    return this.service.nearby(query.lat, query.lng, radiusKm);
  }

  // Restrict :id to UUID-like pattern to prevent collisions with other static paths
  @Get(':id([0-9a-fA-F-]{36})')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @SnakeBody(UpdateRestaurantDto) dto: UpdateRestaurantDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/menu-items')
  addMenuItem(@Param('id') id: string, @SnakeBody(CreateMenuItemDto) dto: CreateMenuItemDto) {
    return this.service.addMenuItem(id, dto);
  }

  @Get(':id([0-9a-fA-F-]{36})/menu-items')
  listMenu(@Param('id') id: string) {
    return this.service.listMenu(id);
  }
}
