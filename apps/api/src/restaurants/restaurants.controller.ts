import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { RestaurantsService } from './restaurants.service';
import {
  CreateRestaurantDto,
  CreateMenuItemDto,
  NearbyQueryDto,
  UpdateRestaurantDto,
} from './dto';
import { SnakeBody } from 'apps/api/src/common/decorators/snake-body.decorator';
import { JwtGuard, RolesGuard } from 'apps/api/src/auth/guard';
import { GetUser, Roles } from 'apps/api/src/auth/decorator';
import { PrismaService } from 'apps/api/src/prisma/prisma.service';

@UseGuards(JwtGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private service: RestaurantsService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  create(
    @GetUser() user: User,
    @SnakeBody(CreateRestaurantDto)
    dto: CreateRestaurantDto,
  ) {
    return this.service.create(dto, user.id);
  }

  @Get()
  listRestaurants(@GetUser() user: User) {
    return this.service.list(user);
  }

  // Define static route before dynamic ':id' to avoid matching 'nearby' as an id
  @Get('nearby')
  getNearbyRestaurants(
    @Query() query: NearbyQueryDto,
  ) {
    const radiusKm = query.radiusKm ?? 5;
    return this.service.nearby(
      query.lat,
      query.lng,
      radiusKm,
    );
  }

  @Get(':id')
  getRestaurantDetails(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.get(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  updateRestaurantMeta(
    @GetUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
    @SnakeBody(UpdateRestaurantDto)
    dto: UpdateRestaurantDto,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post('/menu-items/:restaurantId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RESTAURANT_OWNER, UserRole.ADMIN)
  createMenuItem(
    @GetUser() user: User,
    @Param('restaurantId') restaurantId: string,
    @SnakeBody(CreateMenuItemDto)
    dto: CreateMenuItemDto,
  ) {
    return this.service.createMenuItem(
      restaurantId,
      dto,
      user,
    );
  }

  @Get('/menu-items/:id')
  listMenu(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.listMenu(id);
  }
}
