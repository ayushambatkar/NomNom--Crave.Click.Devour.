import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get ledger entries for a specific entity
   */
  async getLedgerByEntity(entityType: string, entityId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        payment: {
          select: {
            orderId: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalCredit = entries
      .filter((e) => e.type === 'CREDIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalDebit = entries
      .filter((e) => e.type === 'DEBIT')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      entityType,
      entityId,
      totalCredit,
      totalDebit,
      balance: totalCredit - totalDebit,
      entries,
    };
  }

  /**
   * Get restaurant earnings
   */
  async getRestaurantEarnings(restaurantId: string) {
    return this.getLedgerByEntity('RESTAURANT', restaurantId);
  }

  /**
   * Get platform revenue
   */
  async getPlatformRevenue() {
    return this.getLedgerByEntity('PLATFORM', 'platform');
  }

  /**
   * Get delivery partner earnings
   */
  async getDeliveryPartnerEarnings(partnerId: string) {
    return this.getLedgerByEntity('DELIVERY_PARTNER', partnerId);
  }

  /**
   * Get ledger summary (all entities)
   */
  async getLedgerSummary() {
    const allEntries = await this.prisma.ledgerEntry.groupBy({
      by: ['entityType'],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return allEntries.map((entry) => ({
      entityType: entry.entityType,
      totalAmount: Number(entry._sum.amount || 0),
      transactionCount: entry._count.id,
    }));
  }
}
