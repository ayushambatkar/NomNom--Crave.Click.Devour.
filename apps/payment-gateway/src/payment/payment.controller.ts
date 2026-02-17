import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  initiatePayment(@Body() dto: InitiatePaymentDto) {
    return this.paymentService.initiatePayment(dto);
  }

  @Get('order/:orderId')
  getPaymentByOrderId(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentByOrderId(orderId);
  }

  @Get(':paymentId')
  getPaymentById(@Param('paymentId') paymentId: string) {
    return this.paymentService.getPaymentById(paymentId);
  }
}
