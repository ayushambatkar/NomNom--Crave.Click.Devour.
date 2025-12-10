import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CartService } from 'src/cart/cart.service';
import { UsersService } from 'src/users/users.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { RabbitMQService } from 'src/common/mq/rabbitmq.service';

interface OrderEventRecord {
  orderId: string;
  type: string;
  timestamp: Date;
  data?: any;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('OrdersService');
  private lifecycleInterval: NodeJS.Timer | null = null;
  private paymentWatchers = new Map<string, NodeJS.Timeout[]>();
  private events: OrderEventRecord[] = [];

  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private usersService: UsersService,
    private mq: RabbitMQService,
  ) {}

  async checkout(userId: string, note?: string) {
    // Validate user is registered (not guest)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { address: true },
    });
    if (!user) throw new BadRequestException('User not found');
    if (!user.address) {
      throw new BadRequestException('Address required before checkout');
    }
    // Get cart
    const cart = await this.cartService.getCart(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    // Create Order with PENDING & INITIATED
    const order = await this.prisma.order.create({
      data: {
        userId: userId,
        restaurantId: cart.restaurant?.id ?? null,
        amount: cart.total,
        paymentStatus: PaymentStatus.INITIATED,
        orderStatus: OrderStatus.PENDING,
        addressSnapshot: {
          userAddress: user.address,
          restaurantAddress: cart.restaurant?.id || null,
          note: note || null,
        },
      },
    });
    // Snapshot items
    for (const it of cart.items) {
      await this.prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: it.menuItem?.id ?? null,
          nameSnapshot: it.menuItem?.name || 'Unknown',
          unitPriceSnapshot: it.unitPrice,
          quantity: it.quantity,
        },
      });
    }
    // Create payment row
    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        status: PaymentStatus.INITIATED,
        provider: 'DUMMY',
        transactionId: 'txn_' + order.id.slice(0, 8),
      },
    });
    await this.cartService.clear(userId);
    this.recordEvent(order.id, 'order.payment.initiated');
    // Schedule pending & success/failure
    this.schedulePaymentFlow(order.id);
    return this.buildInvoice(order.id);
  }

  private schedulePaymentFlow(orderId: string) {
    const timers: NodeJS.Timeout[] = [];
    // Move to PENDING after 5s
    timers.push(
      setTimeout(async () => {
        // Publish to RabbitMQ; fallback to direct update if MQ not available
        try {
          await this.mq.publish('payments', {
            type: 'order.payment.pending',
            orderId,
          });
        } catch {
          await this.updatePayment(orderId, PaymentStatus.PENDING);
        }
        this.recordEvent(orderId, 'order.payment.pending');
      }, 5000),
    );
    // Decide success/failure after 15s total (10s after pending)
    timers.push(
      setTimeout(async () => {
        const fail = Math.random() < 0.2; // 20% failure
        if (fail) {
          try {
            await this.mq.publish('payments', {
              type: 'order.payment.failed',
              orderId,
            });
          } catch {
            await this.updatePayment(orderId, PaymentStatus.FAILED);
            await this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
          }
          this.recordEvent(orderId, 'order.payment.failed');
          this.recordEvent(orderId, 'order.cancelled');
        } else {
          try {
            await this.mq.publish('payments', {
              type: 'order.payment.success',
              orderId,
            });
          } catch {
            await this.updatePayment(orderId, PaymentStatus.SUCCESS);
            await this.updateOrderStatus(orderId, OrderStatus.CONFIRMED);
          }
          this.recordEvent(orderId, 'order.payment.success');
          this.recordEvent(orderId, 'order.confirmed');
        }
      }, 15000),
    );
    this.paymentWatchers.set(orderId, timers);
    // Start lifecycle interval if not active
    if (!this.lifecycleInterval) {
      this.lifecycleInterval = setInterval(
        () => this.advanceLifecycle(),
        10000,
      );
    }
  }

  private async advanceLifecycle() {
    // Cancel unpaid (still INITIATED or PENDING) after 60s
    const now = new Date();
    const cutoff = new Date(now.getTime() - 60000);
    const unpaid = await this.prisma.order.findMany({
      where: {
        paymentStatus: { in: [PaymentStatus.INITIATED, PaymentStatus.PENDING] },
        createdAt: { lt: cutoff },
        orderStatus: OrderStatus.PENDING,
      },
    });
    for (const o of unpaid) {
      await this.updateOrderStatus(o.id, OrderStatus.CANCELLED);
      this.recordEvent(o.id, 'order.cancelled.unpaid');
    }

    // Progress confirmed orders through ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
    const progressing = await this.prisma.order.findMany({
      where: {
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY] },
      },
    });
    for (const o of progressing) {
      let next: OrderStatus | null = null;
      switch (o.orderStatus) {
        case OrderStatus.CONFIRMED:
          next = OrderStatus.ACCEPTED;
          break;
        case OrderStatus.ACCEPTED:
          next = OrderStatus.PREPARING;
          break;
        case OrderStatus.PREPARING:
          next = OrderStatus.OUT_FOR_DELIVERY;
          break;
        case OrderStatus.OUT_FOR_DELIVERY:
          next = OrderStatus.DELIVERED;
          break;
      }
      if (!next) continue;
      // Random cancellation of 20% (excluding delivered) before moving to next
      if (Math.random() < 0.2 && next !== OrderStatus.DELIVERED) {
        await this.updateOrderStatus(o.id, OrderStatus.CANCELLED);
        this.recordEvent(o.id, 'order.cancelled.random');
        continue;
      }
      await this.updateOrderStatus(o.id, next);
      this.recordEvent(o.id, 'order.status.' + next.toLowerCase());
    }
  }

  private recordEvent(orderId: string, type: string, data?: any) {
    this.events.push({ orderId, type, timestamp: new Date(), data });
    this.logger.log(`Event ${type} for order ${orderId}`);
  }

  async buildInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
    if (!order) throw new BadRequestException('Order not found');
    return {
      id: order.id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      amount: order.amount,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      addressSnapshot: order.addressSnapshot,
      items: order.items.map((it) => ({
        id: it.id,
        name: it.nameSnapshot,
        unitPrice: it.unitPriceSnapshot,
        quantity: it.quantity,
      })),
      payment: order.payment,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async listUserOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => ({
      id: o.id,
      restaurantId: o.restaurantId,
      amount: o.amount,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      createdAt: o.createdAt,
    }));
  }

  getOrderEvents(orderId: string) {
    return this.events.filter((e) => e.orderId === orderId);
  }

  private updateOrderStatus(orderId: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });
  }
  private async updatePayment(orderId: string, status: PaymentStatus) {
    await this.prisma.payment.update({
      where: { orderId },
      data: { status },
    });
    // Mirror status on order for quick access
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: status },
    });
  }
}
