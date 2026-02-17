import { Injectable, Logger } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { PaymentStatus } from '../../../../node_modules/.prisma/payment-gateway-client';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger('WebhookService');
  private readonly apiWebhookUrl: string;

  constructor(private paymentService: PaymentService) {
    // Get API webhook URL from environment or use default
    this.apiWebhookUrl = process.env.API_WEBHOOK_URL || 'http://localhost:3000/webhooks/payment';
  }

  /**
   * Notify API of payment status change
   */
  private async notifyAPI(payment: any) {
    try {
      const payload = {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        provider: payment.provider,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(`Notifying API of payment status: ${payment.status} for order ${payment.orderId}`);

      const response = await fetch(this.apiWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API webhook failed: ${response.status} - ${error}`);
      }

      const result = await response.json();
      this.logger.log(`API webhook response: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Failed to notify API: ${error.message}`, error.stack);
      // Don't throw - payment status should still be updated even if webhook fails
    }
  }

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
    const payment = await this.paymentService.updatePaymentStatus(
      paymentId,
      PaymentStatus.SUCCESS,
      `mock_provider_${Date.now()}`,
      { simulatedAt: new Date(), method: 'MOCK' },
    );

    // Notify API of payment success
    await this.notifyAPI(payment);

    return { success: true, message: 'Payment marked as successful' };
  }

  /**
   * Simulate failed payment (for testing)
   */
  async simulatePaymentFailure(paymentId: string, reason?: string) {
    const payment = await this.paymentService.updatePaymentStatus(
      paymentId,
      PaymentStatus.FAILED,
      undefined,
      { simulatedAt: new Date(), failureReason: reason || 'Simulated failure' },
    );

    // Notify API of payment failure
    await this.notifyAPI(payment);

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
