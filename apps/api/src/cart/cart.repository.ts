import { Injectable } from '@nestjs/common';
import { PrismaService } from 'apps/api/src/prisma/prisma.service';

@Injectable()
export class CartRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  findByUserId(userId: string) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
      },
    });
  }

  upsertByUser(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  findMenuItem(id: string) {
    return this.prisma.menuItem.findUnique({
      where: { id },
    });
  }

  clearCart(cartId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }

  updateCartRestaurant(
    cartId: string,
    restaurantId: string,
  ) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: { restaurantId },
    });
  }

  findCartItem(
    cartId: string,
    menuItemId: string,
  ) {
    return this.prisma.cartItem.findUnique({
      where: {
        cartId_menuItemId: { cartId, menuItemId },
      },
    });
  }

  updateCartItemQuantity(
    id: string,
    quantity: number,
  ) {
    return this.prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });
  }

  createCartItem(
    cartId: string,
    menuItemId: string,
    quantity: number,
    unitPrice: any,
  ) {
    return this.prisma.cartItem.create({
      data: {
        cartId,
        menuItemId,
        quantity,
        unitPrice,
      },
    });
  }

  listCartItems(cartId: string) {
    return this.prisma.cartItem.findMany({
      where: { cartId },
    });
  }

  updateTotals(
    cartId: string,
    totals: {
      subtotal: number;
      handlingFee: number;
      packagingCharges: number;
      deliveryCharges: number;
      taxAmount: number;
      total: number;
    },
  ) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: totals,
    });
  }

  findRestaurant(id: string) {
    return this.prisma.restaurant.findUnique({
      where: { id },
    });
  }
}
