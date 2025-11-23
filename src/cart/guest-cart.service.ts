import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GuestCartRepository } from './guest-cart.repository';
import { GuestCartEntity } from './entities';
import { computeCartTotals } from './util/cart-totals.util';
import { GuestCartDto } from './dto/guest_cart.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class GuestCartService {
  constructor(
    private prisma: PrismaService,
    private guestCartRepo: GuestCartRepository,
  ) { }

  // Redis-specific helpers removed; delegated to GuestCartRepository

  async addItemToGuestCart(
    userId: string,
    menuItemId: string,
    restaurantId: string,
    unitPrice: number,
    quantity: number,
  ) {
    const cart =
      await this.guestCartRepo.ensure(userId);
    // Reset cart if restaurant differs
    if (
      cart.restaurantId &&
      cart.restaurantId !== restaurantId
    ) {
      cart.items = [];
    }
    cart.restaurantId = restaurantId;
    const existing = cart.items.find(
      (it: any) => it.menuItemId === menuItemId,
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({
        menuItemId,
        quantity,
        unitPrice,
      });
    }
    await this.applyTotals(cart);
    await this.guestCartRepo.save(userId, cart);
    return this.buildGuestCartView(userId);
  }

  async removeItemGuest(
    userId: string,
    menuItemId: string,
  ) {
    const cart: GuestCartDto =
      (await this.guestCartRepo.getRaw(userId)) ||
      this.guestCartRepo.empty(userId);
    cart.items = cart.items.filter(
      (it) => it.menuItemId !== menuItemId,
    );
    // if no items remaining, clear restaurantId
    if (cart.items.length === 0) {
      cart.restaurantId = null;
    }
    await this.applyTotals(cart);
    await this.guestCartRepo.save(userId, cart);
    return this.buildGuestCartView(userId);
  }

  private async applyTotals(cart: any) {
    const restaurant = cart.restaurantId
      ? await this.prisma.restaurant.findUnique({
          where: { id: cart.restaurantId },
        })
      : null;
    const totals = computeCartTotals({
      items: cart.items,
      restaurant: restaurant
        ? {
            handlingFee: restaurant.handlingFee,
            packagingCharges:
              restaurant.packagingCharges,
          }
        : null,
    });
    Object.assign(cart, totals);
  }

  async getGuestCartView(userId: string) {
    return this.buildGuestCartView(userId);
  }

  async clear(userId: string) {
    await this.guestCartRepo.save(
      userId,
      this.guestCartRepo.empty(userId),
    );
    return this.buildGuestCartView(userId);
  }

  async ensureCartForUser(userId: string) {
    await this.guestCartRepo.ensure(userId);
  }

  async migrateGuestCartToDb({ guestUserId, newUserId }: { guestUserId: string; newUserId: string }) {
    const cart =
      await this.guestCartRepo.getRaw(guestUserId);
    if (!cart) return;
    // create or ensure DB cart
    const dbCart = await this.prisma.cart.upsert({
      where: { userId: newUserId },
      update: {
        restaurantId:
          cart.restaurantId ?? undefined,
      },
      create: {
        userId: newUserId,
        restaurantId:
          cart.restaurantId ?? undefined,
      },
    });
    // replace items
    await this.prisma.cartItem.deleteMany({
      where: { cartId: dbCart.id },
    });
    await this.prisma.cartItem.createMany({
      data: cart.items.map(it => ({
        cartId: dbCart.id,
        menuItemId: it.menuItemId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    });

    /** 
     * compute totals similar to CartService.updateTotals use the cart service directly here 
     * */
    // const items =
    //   await this.prisma.cartItem.findMany({
    //     where: { cartId: dbCart.id },
    //   });
    // const subtotal = items.reduce(
    //   (sum, it) =>
    //     sum + Number(it.unitPrice) * it.quantity,
    //   0,
    // );
    // let handlingFee = 0;
    // let packagingCharges = 0;
    // let deliveryCharges = 0;
    // let taxAmount = 0;
    // if (cart.restaurantId) {
    //   const r =
    //     await this.prisma.restaurant.findUnique({
    //       where: { id: cart.restaurantId },
    //     });
    //   handlingFee = Number(r?.handlingFee ?? 0);
    //   packagingCharges = Number(
    //     r?.packagingCharges ?? 0,
    //   );
    //   const DELIVERY_FLAT_FEE = Number(
    //     process.env.DELIVERY_FLAT_FEE ?? 20,
    //   );
    //   const TAX_RATE = Number(
    //     process.env.TAX_RATE ?? 0.05,
    //   );
    //   deliveryCharges = DELIVERY_FLAT_FEE;
    //   taxAmount = Number(
    //     (subtotal * TAX_RATE).toFixed(2),
    //   );
    // }
    // const total =
    //   subtotal +
    //   handlingFee +
    //   packagingCharges +
    //   deliveryCharges +
    //   taxAmount;
    // await this.prisma.cart.update({
    //   where: { id: dbCart.id },
    //   data: {
    //     subtotal,
    //     handlingFee,
    //     packagingCharges,
    //     deliveryCharges,
    //     taxAmount,
    //     total,
    //   },
    // });
    // remove guest cart
    await this.guestCartRepo.delete(guestUserId);
  }

  private async buildGuestCartView(userId: string) {
    const raw =
      (await this.guestCartRepo.getRaw(userId)) ||
      this.guestCartRepo.empty(userId);
    const ids = raw.items.map(
      (it: any) => it.menuItemId,
    );
    const menuItems = ids.length
      ? await this.prisma.menuItem.findMany({
          where: { id: { in: ids } },
        })
      : [];
    const restaurant = raw.restaurantId
      ? await this.prisma.restaurant.findUnique({
          where: { id: raw.restaurantId },
        })
      : null;
    return GuestCartEntity.fromRaw(
      raw as any,
      menuItems,
      restaurant,
    ).toView();
  }
}
