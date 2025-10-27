import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) { }

  async getCart(userId: string) {
    const prisma = this.prisma;
    return prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
      },
    });
  }

  async clear(userId: string) {
    const cart = await this.ensureCart(userId);
    const prisma = this.prisma;
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    return this.updateTotals(cart.id, null);
  }

  async addItem(
    userId: string,
    menuItemId: string,
    quantity = 1,
  ) {
    try {


      const cart = await this.ensureCart(userId);
      const prisma = this.prisma;
      const menuItem =
        await prisma.menuItem.findUnique({
          where: { id: menuItemId },
        });
      if (!menuItem)
        throw new NotFoundException(
          'MenuItem not found',
        );

      // If cart has different restaurant, reset
      if (
        cart.restaurantId &&
        cart.restaurantId !== menuItem.restaurantId
      ) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
        await prisma.cart.update({
          where: { id: cart.id },
          data: {
            restaurantId: menuItem.restaurantId,
          },
        });
      } else if (!cart.restaurantId) {
        await prisma.cart.update({
          where: { id: cart.id },
          data: {
            restaurantId: menuItem.restaurantId,
          },
        });
      }

      const existing =
        await prisma.cartItem.findUnique({
          where: {
            cartId_menuItemId: {
              cartId: cart.id,
              menuItemId,
            },
          },
        });
      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + quantity,
          },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            menuItemId,
            quantity,
            unitPrice: menuItem.price,
          },
        });
      }

      return this.updateTotals(
        cart.id,
        menuItem.restaurantId,
      );
    } catch (error) {
      return {
        error: error,
        stacktrace: error.stack,
      }
    }
  }

  async removeItem(
    userId: string,
    menuItemId: string,
  ) {
    const cart = await this.ensureCart(userId);
    const prisma = this.prisma;
    const existing =
      await prisma.cartItem.findUnique({
        where: {
          cartId_menuItemId: {
            cartId: cart.id,
            menuItemId,
          },
        },
      });
    if (!existing) return this.getCart(userId);
    await prisma.cartItem.delete({
      where: { id: existing.id },
    });
    return this.updateTotals(
      cart.id,
      cart.restaurantId ?? null,
    );
  }

  private async ensureCart(userId: string) {
    const prisma = this.prisma;
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }
    return cart;
  }

  // Public wrapper used by other services (e.g., AuthService)
  async ensureCartForUser(userId: string) {
    return this.ensureCart(userId);
  }

  private async updateTotals(
    cartId: string,
    restaurantId: string | null,
  ) {
    const prisma = this.prisma;
    const items = await prisma.cartItem.findMany({
      where: { cartId },
    });
    const subtotal = items.reduce(
      (sum, it) =>
        sum + Number(it.unitPrice) * it.quantity,
      0,
    );

    let handlingFee = 0;
    let packagingCharges = 0;
    let deliveryCharges = 0;
    let taxAmount = 0;
    if (restaurantId) {
      const r =
        await prisma.restaurant.findUnique({
          where: { id: restaurantId },
        });
      handlingFee = Number(r?.handlingFee ?? 0);
      packagingCharges = Number(
        r?.packagingCharges ?? 0,
      );
      // Simple policy: flat delivery fee and percentage tax on subtotal
      const DELIVERY_FLAT_FEE = Number(
        process.env.DELIVERY_FLAT_FEE ?? 20,
      );
      const TAX_RATE = Number(
        process.env.TAX_RATE ?? 0.05,
      ); // 5%
      deliveryCharges = DELIVERY_FLAT_FEE;
      taxAmount = Number(
        (subtotal * TAX_RATE).toFixed(2),
      );
    }
    const total =
      subtotal +
      handlingFee +
      packagingCharges +
      deliveryCharges +
      taxAmount;
    await prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        handlingFee,
        packagingCharges,
        deliveryCharges,
        taxAmount,
        total,
      },
    });
    return prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
      },
    });
  }
}
