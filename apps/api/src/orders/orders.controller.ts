import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtGuard } from 'apps/api/src/auth/guard/jwt.guard';
import { GetUser } from 'apps/api/src/auth/decorator/get-user.decorator';
import { UserEntity } from 'apps/api/src/users/user.entity';

@Controller('orders')
@UseGuards(JwtGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
  ) {}

  @Post('checkout')
  async checkout(
    @GetUser() user: UserEntity,
    @Body() dto: CheckoutDto,
  ) {
    return this.orders.checkout(
      user.id,
      dto.note,
    );
  }

  @Get()
  async list(@GetUser() user: UserEntity) {
    return this.orders.listUserOrders(user.id);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.orders.buildInvoice(id);
  }

  @Get('status/:id')
  async getOrderStatus(@Param('id') orderId: string) {
    return this.orders.getOrderStatus(orderId);
  }
}
