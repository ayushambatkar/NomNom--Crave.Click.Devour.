import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { UseGuards } from '@nestjs/common';
import { GetUser } from 'src/auth/decorator/get-user.decorator';
import { SnakeBody } from 'src/common/decorators/snake-body.decorator';

class AddToCartDto {
  menuItemId: string; // UUID
  quantity: number;
}

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
}
