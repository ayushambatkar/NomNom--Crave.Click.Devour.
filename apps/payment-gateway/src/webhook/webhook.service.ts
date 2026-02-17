import { Injectable } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { PaymentStatus } from '../../../../node_modules/.prisma/payment-gateway-client';

@Injectable()
export class WebhookService {
  constructor(private paymentService: PaymentService) {}

  /**
   * Handle payment webhook from payment provider
   */
  async handlePaymentWebhook(paymentId: string, payload: any) {
    // In real implementation, verify webhook signature here
    
    const status = this.mapWebhookStatus(payload.status);
    
    await this.paymentService.updatePaymentStatus(
      paymentId,
      status,
      payload.providerId,
      payload,
    );

    return { success: true, message: 'Webhook processed' };
  }

  /**
   * Simulate successful payment (for testing)
   */
  async simulatePaymentSuccess(paymentId: string) {
    await this.paymentService.updatePaymentStatus(
      paymentId,
      PaymentStatus.SUCCESS,
      `mock_provider_${Date.now()}`,
      { simulatedAt: new Date(), method: 'MOCK' },
    );

    return { success: true, message: 'Payment marked as successful' };
  }

  /**
   * Simulate failed payment (for testing)
   */
  async simulatePaymentFailure(paymentId: string, reason?: string) {
    await this.paymentService.updatePaymentStatus(
      paymentId,
      PaymentStatus.FAILED,
      undefined,
      { simulatedAt: new Date(), failureReason: reason || 'Simulated failure' },
    );

    return { success: true, message: 'Payment marked as failed' };
  }

  /**
   * Map webhook status to internal status
   */
  private mapWebhookStatus(webhookStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'success': PaymentStatus.SUCCESS,
      'captured': PaymentStatus.SUCCESS,
      'failed': PaymentStatus.FAILED,
      'pending': PaymentStatus.PENDING,
      'authorized': PaymentStatus.PENDING,
    };

    return statusMap[webhookStatus.toLowerCase()] || PaymentStatus.FAILED;
  }
}
