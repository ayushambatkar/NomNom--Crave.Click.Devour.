import { Controller, Post, Body, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from '@prisma/client';

interface WebhookPayload {
  paymentId: string;
  orderId: string;
  status: 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  currency: string;
  provider: string;
  timestamp: string;
}

@Controller('webhooks/payment')
export class PaymentWebhookController {
  private readonly logger = new Logger('PaymentWebhookController');

  constructor(private paymentsService: PaymentsService) {}

  /**
   * Receive payment status updates from payment gateway
   */
  @Post()
  async handlePaymentWebhook(@Body() payload: WebhookPayload) {
    this.logger.log(
      `Received payment webhook: ${payload.status} for order ${payload.orderId}`,
    );

    try {
      // Map gateway status to internal PaymentStatus enum
      const statusMap: Record<string, PaymentStatus> = {
        INITIATED: PaymentStatus.INITIATED,
        PENDING: PaymentStatus.PENDING,
        SUCCESS: PaymentStatus.SUCCESS,
        FAILED: PaymentStatus.FAILED,
      };

      const status = statusMap[payload.status];
      if (!status) {
        this.logger.warn(`Unknown payment status: ${payload.status}`);
        return { status: 'ignored' };
      }

      // Update payment status in our database
      await this.paymentsService.updateStatus(payload.orderId, status);

      this.logger.log(
        `Updated payment status for order ${payload.orderId} to ${status}`,
      );

      return {
        status: 'success',
        orderId: payload.orderId,
        paymentStatus: status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process payment webhook: ${error.message}`,
        error.stack,
      );
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}
