import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtGuard } from 'apps/api/src/auth/guard/jwt.guard';
import { UseGuards } from '@nestjs/common';
import { GetUser } from 'apps/api/src/auth/decorator/get-user.decorator';
import { SnakeBody } from 'apps/api/src/common/decorators/snake-body.decorator';
import { AddToCartDto } from './dto/add_to_cart.dto';
import { DecrementDto } from './dto';

@UseGuards(JwtGuard)
@Controller('cart')
export class CartController {
  constructor(private service: CartService) {}

  @Get()
  getCart(@GetUser('id') userId: string) {
    return this.service.getCart(userId);
  }

  @Post('add')
  add(
    @GetUser('id') userId: string,
    @SnakeBody(AddToCartDto) dto: AddToCartDto,
  ) {
    return this.service.addItem(
      userId,
      dto.menuItemId,
      dto.quantity ?? 1,
    );
  }

  @Post('clear')
  clear(@GetUser('id') userId: string) {
    return this.service.clear(userId);
  }

  @Delete('item/:menuItemId')
  remove(
    @GetUser('id') userId: string,
    @Param('menuItemId', new ParseUUIDPipe())
    menuItemId: string,
  ) {
    return this.service.removeItem(
      userId,
      menuItemId,
    );
  }

  @Get('decrement')
  decrementItem(
    @GetUser('id') userId: string,
    @Query() decrementDto: DecrementDto,
  ) {
    return this.service.decrementItem(
      userId,
      decrementDto.menuItemId,
      decrementDto.quantity,
    );
  }
}
