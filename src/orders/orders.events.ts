import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from 'src/common/mq/rabbitmq.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersEvents implements OnModuleInit {
  private readonly logger = new Logger('OrdersEvents');
  private lifecycleInterval: NodeJS.Timer | null = null;
  private readonly paymentsQueue = 'payments';
  private readonly ordersQueue = 'orders';

  constructor(
    private mq: RabbitMQService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.mq.assertQueue(this.paymentsQueue);
    await this.mq.assertQueue(this.ordersQueue);
    // Consumers
    await this.mq.consume(this.paymentsQueue, (msg) => this.handlePaymentEvent(msg));
    await this.mq.consume(this.ordersQueue, (msg) => this.handleOrderEvent(msg));
    // Lifecycle ticker to publish progression and cancellations
    if (!this.lifecycleInterval) {
      this.lifecycleInterval = setInterval(() => this.tickOrders(), 10000);
    }
  }

  // Payment consumer
  private async handlePaymentEvent(msg: any) {
    const { type, orderId } = msg;
    this.logger.log(`payments <- ${type} for ${orderId}`);
    switch (type) {
      case 'order.payment.initiated':
        await this.updatePayment(orderId, PaymentStatus.INITIATED);
        break;
      case 'order.payment.pending':
        await this.updatePayment(orderId, PaymentStatus.PENDING);
        break;
      case 'order.payment.success':
        await this.updatePayment(orderId, PaymentStatus.SUCCESS);
        // emit order confirmed
        await this.mq.publish(this.ordersQueue, {
          type: 'order.status.confirmed',
          orderId,
        });
        break;
      case 'order.payment.failed':
        await this.updatePayment(orderId, PaymentStatus.FAILED);
        await this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
        break;
    }
  }

  // Orders consumer
  private async handleOrderEvent(msg: any) {
    const { type, orderId } = msg;
    this.logger.log(`orders <- ${type} for ${orderId}`);
    const map: Record<string, OrderStatus> = {
      'order.status.confirmed': OrderStatus.CONFIRMED,
      'order.status.accepted': OrderStatus.ACCEPTED,
      'order.status.preparing': OrderStatus.PREPARING,
      'order.status.out_for_delivery': OrderStatus.OUT_FOR_DELIVERY,
      'order.status.delivered': OrderStatus.DELIVERED,
      'order.cancelled.random': OrderStatus.CANCELLED,
      'order.cancelled.unpaid': OrderStatus.CANCELLED,
    } as const;
    const status = map[type];
    if (status) {
      await this.updateOrderStatus(orderId, status);
    }
  }

  private async tickOrders() {
    // Cancel unpaid older than 60s
    const cutoff = new Date(Date.now() - 60000);
    const unpaid = await this.prisma.order.findMany({
      where: {
        paymentStatus: { in: [PaymentStatus.INITIATED, PaymentStatus.PENDING] },
        createdAt: { lt: cutoff },
        orderStatus: OrderStatus.PENDING,
      },
      select: { id: true },
    });
    for (const o of unpaid) {
      await this.mq.publish(this.ordersQueue, {
        type: 'order.cancelled.unpaid',
        orderId: o.id,
      });
    }

    // Progress current orders or cancel 20%
    const current = await this.prisma.order.findMany({
      where: {
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY] },
      },
      select: { id: true, orderStatus: true },
    });
    for (const o of current) {
      if (Math.random() < 0.2) {
        await this.mq.publish(this.ordersQueue, {
          type: 'order.cancelled.random',
          orderId: o.id,
        });
        continue;
      }
      const next = this.nextStatus(o.orderStatus);
      if (next) {
        const type = `order.status.${next.toLowerCase()}`;
        await this.mq.publish(this.ordersQueue, { type, orderId: o.id });
      }
    }
  }

  private nextStatus(s: OrderStatus): OrderStatus | null {
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

  private async updateOrderStatus(orderId: string, status: OrderStatus) {
    await this.prisma.order.update({ where: { id: orderId }, data: { orderStatus: status } });
  }
  private async updatePayment(orderId: string, status: PaymentStatus) {
    await this.prisma.payment.update({ where: { orderId }, data: { status } });
    await this.prisma.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
  }
}
