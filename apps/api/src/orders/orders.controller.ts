import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtGuard } from 'apps/api/src/auth/guard/jwt.guard';
import { GetUser } from 'apps/api/src/auth/decorator/get-user.decorator';
import { UserEntity } from 'apps/api/src/users/user.entity';

@Controller('orders')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@ApiTags('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
  ) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout the current user cart' })
  @ApiBody({ type: CheckoutDto })
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
  @ApiOperation({ summary: 'List the current user orders' })
  async list(@GetUser() user: UserEntity) {
    return this.orders.listUserOrders(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order invoice' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async get(@Param('id') id: string) {
    return this.orders.buildInvoice(id);
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Get an order payment status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async getOrderStatus(@Param('id') orderId: string) {
    return this.orders.getOrderStatus(orderId);
  }
}
