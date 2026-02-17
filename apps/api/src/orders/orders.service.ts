import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CartService } from 'apps/api/src/cart/cart.service';
import { UsersService } from 'apps/api/src/users/users.service';
import { CacheService } from '@app/redis/cache.service';
import { OrdersRepository } from './orders.repository';
import { PaymentsService } from 'apps/api/src/payments/payments.service';
import { PrismaService } from 'apps/api/src/prisma/prisma.service';

interface OrderEventRecord {
  orderId: string;
  type: string;
  timestamp: Date;
  data?: any;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(
    'OrdersService',
  );
  private events: OrderEventRecord[] = [];

  constructor(
    private ordersRepository: OrdersRepository,
    private paymentsService: PaymentsService,
    private cartService: CartService,
    private usersService: UsersService,
    private cache: CacheService,
    private prisma: PrismaService,
  ) {}

  /**
   * Create an order from the user's cart and initiate payment flow.
   *
   * @description Flow:
   * 1. Validate user exists and has a delivery address
   * 2. Retrieve cart and validate it's not empty
   * 3. Create order with PENDING status via OrdersRepository
   * 4. Snapshot all cart items as OrderItems (preserves price at time of order)
   * 5. Create payment record via PaymentsService (INITIATED status)
   * 6. Clear the user's cart
   * 7. Invalidate user's orders cache
   * 8. Schedule simulated payment flow (5s → PENDING, 15s → SUCCESS/FAILED)
   * 9. Return invoice with order details
   *
   * @param userId - The ID of the user checking out
   * @param note - Optional delivery note (e.g., "No onions", "Call on arrival")
   * @returns Invoice object with order, items, and payment details
   * @throws BadRequestException if user not found, no address, or cart empty
   */
  async checkout(userId: string, note?: string) {
    // Validate user is registered (not guest)
    const user =
      await this.prisma.user.findUnique({
        where: { id: userId },
        include: { address: true },
      });
    if (!user)
      throw new BadRequestException(
        'User not found',
      );
    if (!user.address) {
      throw new BadRequestException(
        'Address required before checkout',
      );
    }

    // Get cart
    const cart =
      await this.cartService.getCart(userId);
    if (
      !cart ||
      !cart.items ||
      cart.items.length === 0
    ) {
      throw new BadRequestException(
        'Cart is empty',
      );
    }

    // Create Order with PENDING & INITIATED via repository
    const order =
      await this.ordersRepository.create({
        userId: userId,
        restaurantId: cart.restaurant?.id ?? null,
        amount: cart.total,
        addressSnapshot: {
          userAddress: user.address,
          restaurantAddress:
            cart.restaurant?.id || null,
          note: note || null,
        },
      });

    // Snapshot items via repository
    for (const it of cart.items) {
      await this.ordersRepository.createOrderItem(
        {
          orderId: order.id,
          menuItemId: it.menuItem?.id ?? null,
          nameSnapshot:
            it.menuItem?.name || 'Unknown',
          unitPriceSnapshot: it.unitPrice,
          quantity: it.quantity,
        },
      );
    }

    // Create payment record via payments service
    await this.paymentsService.createPayment(
      order.id,
    );

    await this.cartService.clear(userId);

    // Invalidate user's orders cache since new order created
    await this.cache.onOrderChanged(userId);

    this.recordEvent(
      order.id,
      'order.payment.initiated',
    );

    // Schedule payment flow via payments service
    this.paymentsService.schedulePaymentFlow(
      order.id,
    );

    return this.buildInvoice(order.id);
  }

  /**
   * Record an in-memory event for order tracking/debugging.
   * @private
   */
  private recordEvent(
    orderId: string,
    type: string,
    data?: any,
  ) {
    this.events.push({
      orderId,
      type,
      timestamp: new Date(),
      data,
    });
    this.logger.log(
      `Event ${type} for order ${orderId}`,
    );
  }

  /**
   * Build a complete invoice for an order.
   *
   * @description Fetches order with all related data (items, payment)
   * and transforms it into a client-friendly invoice format.
   *
   * @param orderId - The UUID of the order
   * @returns Invoice object containing:
   *   - Order metadata (id, userId, restaurantId, amount, statuses)
   *   - Address snapshot (preserved from checkout time)
   *   - Items array with name, unitPrice, quantity
   *   - Payment details (provider, status, transactionId)
   *   - Timestamps (createdAt, updatedAt)
   * @throws BadRequestException if order not found
   */
  async buildInvoice(orderId: string) {
    const order =
      await this.ordersRepository.findByIdWithDetails(
        orderId,
      );
    if (!order)
      throw new BadRequestException(
        'Order not found',
      );
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

  /**
   * Get list of orders for a user (cached).
   *
   * @description
   * - Uses Redis cache with 2-minute TTL (orders change frequently)
   * - Cache key: `user:{userId}:orders`
   * - Returns summary view (no items/payment details)
   * - Cache invalidated on order create/update via CacheService.onOrderChanged()
   *
   * @param userId - The ID of the user
   * @returns Array of order summaries sorted by createdAt DESC
   */
  async listUserOrders(userId: string) {
    // Cache user orders list (short TTL since orders change frequently)
    return this.cache.getUserOrders(
      userId,
      async () => {
        const orders =
          await this.ordersRepository.findByUserId(
            userId,
          );
        return orders.map((o) => ({
          id: o.id,
          restaurantId: o.restaurantId,
          amount: o.amount,
          paymentStatus: o.paymentStatus,
          orderStatus: o.orderStatus,
          createdAt: o.createdAt,
        }));
      },
    );
  }

  /**
   * Get in-memory event log for an order (debugging/tracking).
   *
   * @description Events are stored in-memory and include:
   * - order.payment.initiated
   * - order.payment.pending
   * - order.payment.success / order.payment.failed
   * - order.confirmed, order.cancelled, etc.
   *
   * @param orderId - The UUID of the order
   * @returns Array of OrderEventRecord with type, timestamp, and optional data
   */
  getOrderEvents(orderId: string) {
    return this.events.filter(
      (e) => e.orderId === orderId,
    );
  }

  async getOrderStatus(orderId: string) {
    const events = this.events.filter(
      (e) => e.orderId === orderId,
    );
    const lastEvent = events[events.length - 1];
    return {
      status: lastEvent?.type || null,
    };
  } 
}
