import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

export interface CreateOrderData {
  userId: string;
  restaurantId: string | null;
  amount: number;
  addressSnapshot: Prisma.InputJsonValue;
}

export interface CreateOrderItemData {
  orderId: string;
  menuItemId: string | null;
  nameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
}

@Injectable()
export class OrdersRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateOrderData) {
    return this.prisma.order.create({
      data: {
        userId: data.userId,
        restaurantId: data.restaurantId,
        amount: data.amount,
        paymentStatus: PaymentStatus.INITIATED,
        orderStatus: OrderStatus.PENDING,
        addressSnapshot: data.addressSnapshot,
      },
    });
  }

  async createOrderItem(data: CreateOrderItemData) {
    return this.prisma.orderItem.create({
      data: {
        orderId: data.orderId,
        menuItemId: data.menuItemId,
        nameSnapshot: data.nameSnapshot,
        unitPriceSnapshot: data.unitPriceSnapshot,
        quantity: data.quantity,
      },
    });
  }

  async findById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
    });
  }

  async findByIdWithDetails(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUnpaidOrders(cutoffDate: Date) {
    return this.prisma.order.findMany({
      where: {
        paymentStatus: { in: [PaymentStatus.INITIATED, PaymentStatus.PENDING] },
        createdAt: { lt: cutoffDate },
        orderStatus: OrderStatus.PENDING,
      },
      select: { id: true },
    });
  }

  async findActiveOrders() {
    return this.prisma.order.findMany({
      where: {
        orderStatus: {
          in: [
            OrderStatus.CONFIRMED,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
      select: { id: true, orderStatus: true, userId: true },
    });
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
    });
  }

  async updatePaymentStatus(orderId: string, status: PaymentStatus) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: status },
    });
  }
}
