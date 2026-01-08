import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

export interface CreatePaymentData {
  orderId: string;
  provider: string;
  transactionId: string;
}

@Injectable()
export class PaymentsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePaymentData) {
    return this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        status: PaymentStatus.INITIATED,
        provider: data.provider,
        transactionId: data.transactionId,
      },
    });
  }

  async findByOrderId(orderId: string) {
    return this.prisma.payment.findUnique({
      where: { orderId },
    });
  }

  async updateStatus(
    orderId: string,
    status: PaymentStatus,
  ) {
    // Update payment status
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
