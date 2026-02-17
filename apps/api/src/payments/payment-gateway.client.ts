import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@app/common';

interface InitiatePaymentRequest {
  orderId: string;
  amount: number;
  currency?: string;
}

interface PaymentResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paymentUrl?: string;
}

@Injectable()
export class PaymentGatewayClient {
  private readonly logger = new Logger('PaymentGatewayClient');
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get('PAYMENT_GATEWAY_URL') || 'http://localhost:3001';
  }

  /**
   * Initiate payment via payment gateway
   */
  async initiatePayment(request: InitiatePaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: request.orderId,
          amount: request.amount,
          currency: request.currency || 'INR',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Payment gateway error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      this.logger.log(`Payment initiated for order ${request.orderId}: ${data.paymentId}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to initiate payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get payment status by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<PaymentResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/order/${orderId}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Payment gateway error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to get payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Simulate successful payment (for testing)
   */
  async simulateSuccess(paymentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/webhook/simulate/success/${paymentId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to simulate payment: ${response.status} - ${error}`);
      }

      this.logger.log(`Simulated successful payment: ${paymentId}`);
    } catch (error) {
      this.logger.error(`Failed to simulate payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Simulate failed payment (for testing)
   */
  async simulateFailed(paymentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/webhook/simulate/failed/${paymentId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to simulate payment: ${response.status} - ${error}`);
      }

      this.logger.log(`Simulated failed payment: ${paymentId}`);
    } catch (error) {
      this.logger.error(`Failed to simulate payment: ${error.message}`, error.stack);
      throw error;
    }
  }
}
