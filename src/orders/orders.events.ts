import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { RabbitMQService } from 'src/common/mq/rabbitmq.service';
import { OrderStatus } from '@prisma/client';
import { OrdersRepository } from './orders.repository';
import { PaymentsService } from 'src/payments/payments.service';
import { CacheService } from 'src/common/redis/cache.service';

/**
 * OrdersEvents - RabbitMQ consumers and order lifecycle management.
 *
 * @description Handles asynchronous order/payment processing:
 * - Consumes 'payments' queue for payment status updates
 * - Consumes 'orders' queue for order status transitions
 * - Runs lifecycle ticker every 10s to progress/cancel orders
 *
 * Queues:
 * - payments: Payment status events (initiated, pending, success, failed)
 * - orders: Order status events (confirmed, accepted, preparing, delivered, cancelled)
 */
@Injectable()
export class OrdersEvents
  implements OnModuleInit
{
  private readonly logger = new Logger(
    'OrdersEvents',
  );
  private lifecycleInterval: NodeJS.Timer | null =
    null;
  private readonly paymentsQueue = 'payments';
  private readonly ordersQueue = 'orders';

  constructor(
    private mq: RabbitMQService,
    private ordersRepository: OrdersRepository,
    private paymentsService: PaymentsService,
    private cache: CacheService,
  ) {}

  /**
   * Initialize message queue consumers and lifecycle ticker.
   *
   * @description Called automatically by NestJS on module init:
   * 1. Assert 'payments' and 'orders' queues exist
   * 2. Register consumers for both queues
   * 3. Start 10-second interval ticker for order progression
   */
  async onModuleInit() {
    await this.mq.assertQueue(this.paymentsQueue);
    await this.mq.assertQueue(this.ordersQueue);

    // Consumers
    await this.mq.consume(
      this.paymentsQueue,
      (msg) => this.handlePaymentEvent(msg),
    );
    await this.mq.consume(
      this.ordersQueue,
      (msg) => this.handleOrderEvent(msg),
    );

    // Lifecycle ticker to publish progression and cancellations
    if (!this.lifecycleInterval) {
      this.lifecycleInterval = setInterval(
        () => this.tickOrders(),
        10000,
      );
    }
  }

  /**
   * Payment queue consumer - delegates to PaymentsService.
   *
   * @description Processes payment events from RabbitMQ:
   * - Delegates status update logic to PaymentsService.handlePaymentEvent()
   * - On payment success, publishes 'order.status.confirmed' to orders queue
   *
   * @private
   * @param msg - Message containing { type, orderId }
   */
  private async handlePaymentEvent(msg: any) {
    const { type, orderId } = msg;
    this.logger.log(
      `payments <- ${type} for ${orderId}`,
    );

    await this.paymentsService.handlePaymentEvent(
      orderId,
      type,
      async (oid, status) => {
        await this.updateOrderStatus(oid, status);
        // If order confirmed, also publish to orders queue
        if (status === OrderStatus.CONFIRMED) {
          await this.mq.publish(
            this.ordersQueue,
            {
              type: 'order.status.confirmed',
              orderId: oid,
            },
          );
        }
      },
    );
  }

  /**
   * Orders queue consumer - updates order status.
   *
   * @description Maps event types to OrderStatus enum:
   * - order.status.confirmed     → CONFIRMED
   * - order.status.accepted      → ACCEPTED
   * - order.status.preparing     → PREPARING
   * - order.status.out_for_delivery → OUT_FOR_DELIVERY
   * - order.status.delivered     → DELIVERED
   * - order.cancelled.*          → CANCELLED
   *
   * @private
   * @param msg - Message containing { type, orderId }
   */
  private async handleOrderEvent(msg: any) {
    const { type, orderId } = msg;
    this.logger.log(
      `orders <- ${type} for ${orderId}`,
    );

    const statusMap: Record<string, OrderStatus> =
      {
        'order.status.confirmed':
          OrderStatus.CONFIRMED,
        'order.status.accepted':
          OrderStatus.ACCEPTED,
        'order.status.preparing':
          OrderStatus.PREPARING,
        'order.status.out_for_delivery':
          OrderStatus.OUT_FOR_DELIVERY,
        'order.status.delivered':
          OrderStatus.DELIVERED,
        'order.cancelled.random':
          OrderStatus.CANCELLED,
        'order.cancelled.unpaid':
          OrderStatus.CANCELLED,
      };

    const status = statusMap[type];
    if (status) {
      await this.updateOrderStatus(
        orderId,
        status,
      );
    }
  }

  /**
   * Lifecycle ticker - runs every 10 seconds.
   *
   * @description Handles automatic order progression and timeouts:
   *
   * 1. Cancel Unpaid Orders:
   *    - Find orders with INITIATED/PENDING payment older than 60s
   *    - Publish 'order.cancelled.unpaid' event
   *
   * 2. Progress Active Orders:
   *    - Find orders in CONFIRMED/ACCEPTED/PREPARING/OUT_FOR_DELIVERY
   *    - 20% chance: cancel randomly (simulates real-world issues)
   *    - 80% chance: advance to next status
   *
   * Order Progression:
   * CONFIRMED → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
   *
   * @private
   */
  private async tickOrders() {
    // Cancel unpaid older than 60s
    const cutoff = new Date(Date.now() - 60000);
    const unpaid =
      await this.ordersRepository.findUnpaidOrders(
        cutoff,
      );

    for (const o of unpaid) {
      await this.mq.publish(this.ordersQueue, {
        type: 'order.cancelled.unpaid',
        orderId: o.id,
      });
    }

    // Progress current orders or cancel 20%
    const current =
      await this.ordersRepository.findActiveOrders();

    for (const o of current) {
      if (Math.random() < 0.2) {
        await this.mq.publish(this.ordersQueue, {
          type: 'order.cancelled.random',
          orderId: o.id,
        });
        // Invalidate cache for user
        if (o.userId) {
          await this.cache.onOrderChanged(
            o.userId,
          );
        }
        continue;
      }

      const next = this.nextStatus(o.orderStatus);
      if (next) {
        const type = `order.status.${next.toLowerCase()}`;
        await this.mq.publish(this.ordersQueue, {
          type,
          orderId: o.id,
        });
      }
    }
  }

  /**
   * Determine the next status in order progression.
   *
   * @description State machine for order lifecycle:
   * CONFIRMED → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
   *
   * @private
   * @param s - Current order status
   * @returns Next status or null if terminal (DELIVERED/CANCELLED)
   */
  private nextStatus(
    s: OrderStatus,
  ): OrderStatus | null {
    switch (s) {
      case OrderStatus.CONFIRMED:
        return OrderStatus.ACCEPTED;
      case OrderStatus.ACCEPTED:
        return OrderStatus.PREPARING;
      case OrderStatus.PREPARING:
        return OrderStatus.OUT_FOR_DELIVERY;
      case OrderStatus.OUT_FOR_DELIVERY:
        return OrderStatus.DELIVERED;
      default:
        return null;
    }
  }

  /**
   * Update order status and invalidate cache.
   *
   * @description
   * 1. Fetch order to get userId
   * 2. Update status via OrdersRepository
   * 3. Invalidate user's orders cache
   *
   * @private
   * @param orderId - The UUID of the order
   * @param status - New OrderStatus value
   */
  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ) {
    const order =
      await this.ordersRepository.findById(
        orderId,
      );
    await this.ordersRepository.updateStatus(
      orderId,
      status,
    );

    // Invalidate user's orders cache
    if (order?.userId) {
      await this.cache.onOrderChanged(
        order.userId,
      );
    }
  }
}
