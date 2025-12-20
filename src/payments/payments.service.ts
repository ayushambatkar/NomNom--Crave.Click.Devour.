import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { PaymentsRepository } from './payments.repository';
import { RabbitMQService } from 'src/common/mq/rabbitmq.service';

const PAYMENTS_QUEUE = 'payments';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');
  private paymentTimers = new Map<string, NodeJS.Timeout[]>();

  constructor(
    private paymentsRepository: PaymentsRepository,
    private mq: RabbitMQService,
  ) {}

  /**
   * Create a new payment record for an order.
   *
   * @description
   * - Generates transaction ID: `txn_{orderId first 8 chars}`
   * - Creates payment with INITIATED status
   * - Called by OrdersService during checkout
   *
   * @param orderId - The UUID of the order
   * @param provider - Payment provider name (default: 'DUMMY')
   * @returns Created payment record
   */
  async createPayment(orderId: string, provider = 'DUMMY') {
    const transactionId = `txn_${orderId.slice(0, 8)}`;
    return this.paymentsRepository.create({
      orderId,
      provider,
      transactionId,
    });
  }

  /**
   * Get payment record by order ID.
   *
   * @param orderId - The UUID of the order
   * @returns Payment record or null if not found
   */
  async getPaymentByOrderId(orderId: string) {
    return this.paymentsRepository.findByOrderId(orderId);
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
  async updateStatus(orderId: string, status: PaymentStatus) {
    return this.paymentsRepository.updateStatus(orderId, status);
  }

  /**
   * Schedule the simulated payment flow for an order.
   *
   * @description Simulates a payment gateway with timed status updates:
   *
   * Timeline:
   * - T+0s:  Payment created with INITIATED status
   * - T+5s:  Publish `order.payment.pending` to RabbitMQ
   * - T+15s: Publish `order.payment.success` (80%) or `order.payment.failed` (20%)
   *
   * Flow:
   * 1. Set timeout for 5s to publish pending event
   * 2. Set timeout for 15s to randomly succeed (80%) or fail (20%)
   * 3. Store timers in map for potential cancellation
   * 4. If RabbitMQ unavailable, falls back to direct DB update
   *
   * @param orderId - The UUID of the order to process
   */
  schedulePaymentFlow(orderId: string) {
    const timers: NodeJS.Timeout[] = [];

    // Move to PENDING after 5s
    timers.push(
      setTimeout(async () => {
        try {
          await this.mq.publish(PAYMENTS_QUEUE, {
            type: 'order.payment.pending',
            orderId,
          });
          this.logger.log(`Published payment.pending for ${orderId}`);
        } catch (err) {
          this.logger.warn(`MQ unavailable, updating payment directly: ${err}`);
          await this.updateStatus(orderId, PaymentStatus.PENDING);
        }
      }, 5000),
    );

    // Decide success/failure after 15s total
    timers.push(
      setTimeout(async () => {
        const shouldFail = Math.random() < 0.2; // 20% failure rate

        if (shouldFail) {
          try {
            await this.mq.publish(PAYMENTS_QUEUE, {
              type: 'order.payment.failed',
              orderId,
            });
            this.logger.log(`Published payment.failed for ${orderId}`);
          } catch (err) {
            this.logger.warn(`MQ unavailable, updating payment directly: ${err}`);
            await this.updateStatus(orderId, PaymentStatus.FAILED);
          }
        } else {
          try {
            await this.mq.publish(PAYMENTS_QUEUE, {
              type: 'order.payment.success',
              orderId,
            });
            this.logger.log(`Published payment.success for ${orderId}`);
          } catch (err) {
            this.logger.warn(`MQ unavailable, updating payment directly: ${err}`);
            await this.updateStatus(orderId, PaymentStatus.SUCCESS);
          }
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
    const timers = this.paymentTimers.get(orderId);
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
    onOrderStatusChange: (orderId: string, status: OrderStatus) => Promise<void>,
  ) {
    this.logger.log(`Handling payment event: ${type} for ${orderId}`);

    switch (type) {
      case 'order.payment.initiated':
        await this.updateStatus(orderId, PaymentStatus.INITIATED);
        break;

      case 'order.payment.pending':
        await this.updateStatus(orderId, PaymentStatus.PENDING);
        break;

      case 'order.payment.success':
        await this.updateStatus(orderId, PaymentStatus.SUCCESS);
        // Trigger order confirmation
        await onOrderStatusChange(orderId, OrderStatus.CONFIRMED);
        break;

      case 'order.payment.failed':
        await this.updateStatus(orderId, PaymentStatus.FAILED);
        // Cancel the order
        await onOrderStatusChange(orderId, OrderStatus.CANCELLED);
        break;
    }
  }
}
