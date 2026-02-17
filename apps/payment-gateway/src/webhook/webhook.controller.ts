import { Controller, Post, Body, Param } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Mock webhook endpoint - simulates payment gateway webhook
   */
  @Post('payment/:paymentId')
  handlePaymentWebhook(
    @Param('paymentId') paymentId: string,
    @Body() payload: any,
  ) {
    return this.webhookService.handlePaymentWebhook(paymentId, payload);
  }

  /**
   * Endpoint to simulate successful payment (for testing)
   */
  @Post('simulate/success/:paymentId')
  simulateSuccess(@Param('paymentId') paymentId: string) {
    return this.webhookService.simulatePaymentSuccess(paymentId);
  }

  /**
   * Endpoint to simulate failed payment (for testing)
   */
  @Post('simulate/failure/:paymentId')
  simulateFailure(@Param('paymentId') paymentId: string, @Body() body: { reason?: string }) {
    return this.webhookService.simulatePaymentFailure(paymentId, body.reason);
  }
}
