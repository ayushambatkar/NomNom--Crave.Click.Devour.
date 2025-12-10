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
import { RestaurantsService } from './restaurants.service';
import {
  CreateRestaurantDto,
  CreateMenuItemDto,
  NearbyQueryDto,
  UpdateRestaurantDto,
} from './dto';
import { SnakeBody } from 'src/common/decorators/snake-body.decorator';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

@UseGuards(JwtGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private service: RestaurantsService,
    private prisma: PrismaService,
  ) {}

  @Post()
  create(
    @SnakeBody(CreateRestaurantDto)
    dto: CreateRestaurantDto,
  ) {
    return this.service.create(dto);
  }

  @Get()
  list(@GetUser() user: User) {
    return this.service.list(user);
  }

  // Define static route before dynamic ':id' to avoid matching 'nearby' as an id
  @Get('nearby')
  nearby(@Query() query: NearbyQueryDto) {
    const radiusKm = query.radiusKm ?? 5;
    return this.service.nearby(
      query.lat,
      query.lng,
      radiusKm,
    );
  }

  @Get(':id')
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.get(id);
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @SnakeBody(UpdateRestaurantDto)
    dto: UpdateRestaurantDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post('/menu-items/:restaurantId')
  createMenuItem(
    @Param('restaurantId') restaurantId: string,
    @SnakeBody(CreateMenuItemDto)
    dto: CreateMenuItemDto,
  ) {
    return this.service.createMenuItem(restaurantId, dto);
  }

  @Get('/menu-items/:id')
  listMenu(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.listMenu(id);
  }
}
