import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InitiatePaymentDto } from './dto';
import { PaymentStatus, Payment } from '../../../../node_modules/.prisma/payment-gateway-client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Initiate a new payment
   */
  async initiatePayment(dto: InitiatePaymentDto): Promise<any> {
    // Check if payment already exists for this order
    const existing = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
    });

    if (existing) {
      throw new ConflictException('Payment already initiated for this order');
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency || 'INR',
        provider: dto.provider || 'mock',
        status: PaymentStatus.INITIATED,
      },
    });

    // Create initial transaction
    await this.prisma.transaction.create({
      data: {
        paymentId: payment.id,
        type: 'DEBIT',
        amount: dto.amount,
        status: 'PENDING',
        description: 'Payment initiated',
      },
    });

    // In a real implementation, this would integrate with Razorpay/Stripe
    // For now, we return a mock payment intent
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      // Mock payment URL
      paymentUrl: `http://localhost:3001/payment/checkout/${payment.id}`,
    };
  }

  /**
   * Get payment status by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Get payment by payment ID
   */
  async getPaymentById(paymentId: string): Promise<any> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        ledgerEntries: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Update payment status (called by webhook)
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    providerId?: string,
    metadata?: any,
  ): Promise<Payment> {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        providerId,
        providerData: metadata,
        updatedAt: new Date(),
      },
    });

    // Create transaction record
    await this.prisma.transaction.create({
      data: {
        paymentId: payment.id,
        type: status === PaymentStatus.SUCCESS ? 'CREDIT' : 'DEBIT',
        amount: payment.amount,
        status: status === PaymentStatus.SUCCESS ? 'SUCCESS' : 'FAILED',
        description: `Payment ${status.toLowerCase()}`,
        metadata,
      },
    });

    // If successful, create ledger entries
    if (status === PaymentStatus.SUCCESS) {
      await this.createLedgerEntries(payment.id, Number(payment.amount));
    }

    return payment;
  }

  /**
   * Create ledger entries for successful payment
   * Example split: 80% to restaurant, 15% delivery, 5% platform
   */
  private async createLedgerEntries(paymentId: string, totalAmount: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    // These values would come from order data in real implementation
    const restaurantAmount = totalAmount * 0.8;
    const deliveryAmount = totalAmount * 0.15;
    const platformAmount = totalAmount * 0.05;

    await this.prisma.ledgerEntry.createMany({
      data: [
        {
          paymentId,
          entityType: 'RESTAURANT',
          entityId: 'restaurant-id-placeholder', // Would come from order
          amount: restaurantAmount,
          type: 'CREDIT',
          description: 'Restaurant earnings',
        },
        {
          paymentId,
          entityType: 'DELIVERY_PARTNER',
          entityId: 'delivery-partner-placeholder',
          amount: deliveryAmount,
          type: 'CREDIT',
          description: 'Delivery fees',
        },
        {
          paymentId,
          entityType: 'PLATFORM',
          entityId: 'platform',
          amount: platformAmount,
          type: 'CREDIT',
          description: 'Platform commission',
        },
      ],
    });
  }
}
