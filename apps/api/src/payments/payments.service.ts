import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  PaymentStatus,
  OrderStatus,
} from '@prisma/client';
import { PaymentsRepository } from './payments.repository';
import { RabbitMQService } from '@app/rabbitmq/rabbitmq.service';
import { PaymentGatewayClient } from './payment-gateway.client';

const PAYMENTS_QUEUE = 'payments';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(
    'PaymentsService',
  );
  private paymentTimers = new Map<
    string,
    NodeJS.Timeout[]
  >();

  constructor(
    private paymentsRepository: PaymentsRepository,
    private mq: RabbitMQService,
    private paymentGateway: PaymentGatewayClient,
  ) {}

  /**
   * Create a new payment record for an order via payment gateway.
   *
   * @description
   * - Calls payment gateway to initiate payment
   * - Creates local payment record with gateway payment ID
   * - Returns payment details with payment URL
   *
   * @param orderId - The UUID of the order
   * @param amount - The total amount to charge
   * @param provider - Payment provider name (default: 'mock')
   * @returns Payment record with payment URL
   */
  async createPayment(
    orderId: string,
    amount: number,
    provider = 'mock',
  ) {
    try {
      // Call payment gateway to initiate payment
      const gatewayResponse = await this.paymentGateway.initiatePayment({
        orderId,
        amount,
        currency: 'INR',
      });

      // Create local payment record with gateway payment ID as transaction ID
      const payment = await this.paymentsRepository.create({
        orderId,
        provider: gatewayResponse.provider,
        transactionId: gatewayResponse.paymentId,
      });

      this.logger.log(`Payment created for order ${orderId}: ${payment.id}`);

      return {
        ...payment,
        paymentUrl: gatewayResponse.paymentUrl,
        gatewayPaymentId: gatewayResponse.paymentId,
      };
    } catch (error) {
      this.logger.error(`Failed to create payment for order ${orderId}:`, error.stack);
      throw error;
    }
  }

  /**
   * Get payment record by order ID.
   *
   * @param orderId - The UUID of the order
   * @returns Payment record or null if not found
   */
  async getPaymentByOrderId(orderId: string) {
    return this.paymentsRepository.findByOrderId(
      orderId,
    );
  }

  /**
   * Update payment status.
   *
   * @description Also mirrors the status to the Order.paymentStatus
   * field for quick access without joins.
   *
   * @param orderId - The UUID of the order
   * @param status - New PaymentStatus (INITIATED, PENDING, SUCCESS, FAILED)
   */
  async updateStatus(
    orderId: string,
    status: PaymentStatus,
  ) {
    return this.paymentsRepository.updateStatus(
      orderId,
      status,
    );
  }

  /**
   * Schedule the payment flow via payment gateway.
   *
   * @description Uses payment gateway's simulation endpoints:
   *
   * Timeline:
   * - T+5s:  Simulate payment processing (gateway moves to PENDING)
   * - T+15s: Simulate payment result (80% success, 20% failure)
   *
   * Flow:
   * 1. Wait 5s then call gateway's /webhook/simulate/success or /failed
   * 2. Gateway processes payment and calls our webhook
   * 3. Our webhook updates order status via RabbitMQ events
   *
   * @param orderId - The UUID of the order
   * @param gatewayPaymentId - Payment ID from gateway
   */
  schedulePaymentFlow(orderId: string, gatewayPaymentId: string) {
    const timers: NodeJS.Timeout[] = [];

    // Simulate payment after 15s (80% success rate)
    timers.push(
      setTimeout(async () => {
        const shouldFail = Math.random() < 0.2; // 20% failure rate

        try {
          if (shouldFail) {
            await this.paymentGateway.simulateFailed(gatewayPaymentId);
            this.logger.log(`Simulated payment failure for ${orderId}`);
          } else {
            await this.paymentGateway.simulateSuccess(gatewayPaymentId);
            this.logger.log(`Simulated payment success for ${orderId}`);
          }
        } catch (error) {
          this.logger.error(`Failed to simulate payment: ${error.message}`);
          // Fallback to direct update
          await this.updateStatus(
            orderId,
            shouldFail ? PaymentStatus.FAILED : PaymentStatus.SUCCESS,
          );
        }

        // Cleanup timers for this order
        this.paymentTimers.delete(orderId);
      }, 15000),
    );

    this.paymentTimers.set(orderId, timers);
  }

  /**
   * Cancel any pending payment timers for an order.
   *
   * @description Used when order is cancelled before payment completes.
   * Clears all setTimeout references to prevent status updates.
   *
   * @param orderId - The UUID of the order
   */
  cancelPaymentTimers(orderId: string) {
    const timers =
      this.paymentTimers.get(orderId);
    if (timers) {
      timers.forEach((t) => clearTimeout(t));
      this.paymentTimers.delete(orderId);
    }
  }

  /**
   * Handle payment event consumed from RabbitMQ.
   *
   * @description Called by OrdersEvents when processing payment queue messages.
   * Updates payment status and triggers order status changes:
   *
   * Event Handling:
   * - `order.payment.initiated` → Update to INITIATED
   * - `order.payment.pending`   → Update to PENDING
   * - `order.payment.success`   → Update to SUCCESS, trigger order CONFIRMED
   * - `order.payment.failed`    → Update to FAILED, trigger order CANCELLED
   *
   * @param orderId - The UUID of the order
   * @param type - The event type string
   * @param onOrderStatusChange - Callback to update order status
   */
  async handlePaymentEvent(
    orderId: string,
    type: string,
    onOrderStatusChange: (
      orderId: string,
      status: OrderStatus,
    ) => Promise<void>,
  ) {
    this.logger.log(
      `Handling payment event: ${type} for ${orderId}`,
    );

    switch (type) {
      case 'order.payment.initiated':
        await this.updateStatus(
          orderId,
          PaymentStatus.INITIATED,
        );
        break;

      case 'order.payment.pending':
        await this.updateStatus(
          orderId,
          PaymentStatus.PENDING,
        );
        break;

      case 'order.payment.success':
        await this.updateStatus(
          orderId,
          PaymentStatus.SUCCESS,
        );
        // Trigger order confirmation
        await onOrderStatusChange(
          orderId,
          OrderStatus.CONFIRMED,
        );
        break;

      case 'order.payment.failed':
        await this.updateStatus(
          orderId,
          PaymentStatus.FAILED,
        );
        // Cancel the order
        await onOrderStatusChange(
          orderId,
          OrderStatus.CANCELLED,
        );
        break;
    }
  }
}
