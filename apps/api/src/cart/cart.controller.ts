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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtGuard } from 'apps/api/src/auth/guard/jwt.guard';
import { UseGuards } from '@nestjs/common';
import { GetUser } from 'apps/api/src/auth/decorator/get-user.decorator';
import { SnakeBody } from 'apps/api/src/common/decorators/snake-body.decorator';
import { AddToCartDto } from './dto/add_to_cart.dto';
import { DecrementDto } from './dto';

@UseGuards(JwtGuard)
@ApiBearerAuth()
@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private service: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current user cart' })
  getCart(@GetUser('id') userId: string) {
    return this.service.getCart(userId);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add a menu item to the cart' })
  @ApiBody({ type: AddToCartDto })
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
  @ApiOperation({ summary: 'Clear the current user cart' })
  clear(@GetUser('id') userId: string) {
    return this.service.clear(userId);
  }

  @Delete('item/:menuItemId')
  @ApiOperation({ summary: 'Remove a menu item from the cart' })
  @ApiParam({ name: 'menuItemId', format: 'uuid' })
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
  @ApiOperation({ summary: 'Decrement a cart item quantity' })
  @ApiQuery({ name: 'menuItemId', format: 'uuid', required: true })
  @ApiQuery({ name: 'quantity', type: Number, required: false })
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
