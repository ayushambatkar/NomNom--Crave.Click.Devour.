import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
import { PrismaService } from 'src/prisma/prisma.service';
import { GuestCartService } from './guest-cart.service';
import { CartRepository } from './cart.repository';
import { CartEntity } from './entities';
import { computeCartTotals } from './util/cart-totals.util';
import { GuestUserService } from 'src/users/guest-user.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private guestCart: GuestCartService,
    private readonly cartRepo: CartRepository,
    private readonly guestUserService: GuestUserService,
  ) {}

  async getCart(userId: string) {
    if (await this.isGuest(userId)) {
      return this.guestCart.getGuestCartView(userId);
    }
    const cart = await this.cartRepo.findByUserId(userId);
    return cart
      ? CartEntity.fromPrisma(cart as any).toView()
      : null;
  }

  async clear(userId: string) {
    if (await this.isGuest(userId)) {
      return this.guestCart.clear(userId);
    }
    const cart = await this.ensureCart(userId);
    await this.cartRepo.deleteCartItems(cart.id);
    return this.updateTotals(cart.id, null);
  }

  async addItem(
    userId: string,
    menuItemId: string,
    quantity = 1,
  ) {
    try {
      const menuItem =
        await this.cartRepo.findMenuItem(
          menuItemId,
        );

      // check for menu item existence
      if (!menuItem)
        throw new NotFoundException(
          'MenuItem not found',
        );
      // Validate quantity
      if (quantity !== null && quantity < 1) {
        throw new BadRequestException(
          'Quantity must be at least 1',
        );
      }
      if (await this.isGuest(userId)) {
        return this.guestCart.addItemToGuestCart(
          userId,
          menuItem.id,
          menuItem.restaurantId,
          Number(menuItem.price),
          quantity,
        );
      }
      const cart = await this.ensureCart(userId);
      /**
       * Cart restaurant consistency check
       */
      // If cart has different restaurant, reset
      if (
        cart.restaurantId &&
        cart.restaurantId !==
          menuItem.restaurantId
      ) {
        await this.cartRepo.deleteCartItems(
          cart.id,
        );
        await this.cartRepo.updateCartRestaurant(
          cart.id,
          menuItem.restaurantId,
        );
      } else if (!cart.restaurantId) {
        // if no restaurant assigned yet
        // assign the restaurant of the first added item
        await this.cartRepo.updateCartRestaurant(
          cart.id,
          menuItem.restaurantId,
        );
      }
      /**
       * Add or update item in cart
       */
      const existing =
        await this.cartRepo.findCartItem(
          cart.id,
          menuItemId,
        );
      if (existing) {
        await this.cartRepo.updateCartItemQuantity(
          existing.id,
          existing.quantity + quantity,
        );
      } else {
        await this.cartRepo.createCartItem(
          cart.id,
          menuItemId,
          quantity,
          menuItem.price,
        );
      }

      return this.updateTotals(
        cart.id,
        menuItem.restaurantId,
      );
    } catch (error) {
      throw error;
    }
  }

  async removeItem(
    userId: string,
    menuItemId: string,
  ) {
    if (await this.isGuest(userId)) {
      return this.guestCart.removeItemGuest(
        userId,
        menuItemId,
      );
    }
    const cart = await this.ensureCart(userId);
    const existing =
      await this.cartRepo.findCartItem(
        cart.id,
        menuItemId,
      );
    if (!existing) return this.getCart(userId);
    await this.prisma.cartItem.delete({
      where: { id: existing.id },
    });
    return this.updateTotals(
      cart.id,
      cart.restaurantId ?? null,
    );
  }

  private async ensureCart(userId: string) {
    if (await this.isGuest(userId)) {
      // Ensure guest cart exists and return a minimal object
      await this.guestCart.ensureCartForUser(
        userId,
      );
      return {
        id: `cart:guest:${userId}`,
        userId,
      } as any;
    }
    const cart =
      await this.cartRepo.upsertByUser(userId);
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
    const items =
      await this.cartRepo.listCartItems(cartId);
    const restaurant = restaurantId
      ? await this.cartRepo.findRestaurant(
          restaurantId,
        )
      : null;
    const totals = computeCartTotals({
      items: items.map((it) => ({
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })),
      restaurant: restaurant
        ? {
            handlingFee: restaurant.handlingFee,
            packagingCharges:
              restaurant.packagingCharges,
          }
        : null,
    });
    await this.cartRepo.updateTotals(
      cartId,
      totals,
    );
    const updated = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
      },
    });
    return updated
      ? CartEntity.fromPrisma(updated as any).toView()
      : null;
  }

  private async isGuest(userId: string) {
    return this.guestUserService.isGuest(userId);
  }
}
