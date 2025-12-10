import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';
import { PrismaService } from 'src/prisma/prisma.service';
// import { GuestCartService } from './guest-cart.service';
import { CartRepository } from './cart.repository';
import { CartEntity } from './entities';
import {
  computeCartTotals,
  haversineDistanceKm,
} from './util/cart-totals.util';
import { GuestUserService } from 'src/users/guest-user.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    // private guestCart: GuestCartService,
    private readonly cartRepo: CartRepository,
    private readonly guestUserService: GuestUserService,
  ) { }

  async getCart(userId: string) {
    if (await this.isGuest(userId)) {
      throw new HttpException(
        'Login Required',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const cart =
      await this.cartRepo.findByUserId(userId);
    return cart
      ? CartEntity.fromPrisma(
        cart as any,
      ).toView()
      : null;
  }

  async clear(userId: string) {
    if (await this.isGuest(userId)) {
      throw new HttpException(
        'Login Required',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const cart = await this.ensureCart(userId);
    await this.cartRepo.clearCart(cart.id);
    return this.updateTotals(
      cart.id,
      userId,
      null,
    );
  }

  async addItem(
    userId: string,
    menuItemId: string,
    quantity = 1,
  ) {
    try {
      if (await this.isGuest(userId)) {
        throw new HttpException(
          'Login Required',
          HttpStatus.UNAUTHORIZED,
        );
      }
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
        await this.cartRepo.clearCart(
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
        userId,
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
      throw new HttpException(
        'Login Required',
        HttpStatus.UNAUTHORIZED,
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
      userId,
      cart.restaurantId ?? null,
    );
  }

  async decrementItem(
    userId: string,
    menuItemId: string,
    quantity = 1,
  ) {
    if (quantity < 1) {
      throw new BadRequestException(
        'Quantity must be at least 1',
      );
    }
    const cart = await this.ensureCart(userId);
    const existing =
      await this.cartRepo.findCartItem(
        cart.id,
        menuItemId,
      );
    if (existing) {
      if (existing.quantity - quantity === 0) {
        return this.removeItem(userId, menuItemId);
      }
      await this.cartRepo.updateCartItemQuantity(
        existing.id,
        existing.quantity - quantity,
      );
      return this.updateTotals(
        existing.cartId,
        userId,
        cart.restaurantId ?? null,
      );
    } else {
      throw new NotFoundException(
        'Item not found in cart',
      );
    }

  }

  private async ensureCart(userId: string) {
    if (await this.isGuest(userId)) {
      throw new HttpException(
        'Login Required',
        HttpStatus.UNAUTHORIZED,
      );
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
    userId: string,
    restaurantId: string | null,
  ) {
    const items =
      await this.cartRepo.listCartItems(cartId);
    const restaurant = restaurantId
      ? await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: { address: true },
      })
      : null;
    const user =
      await this.prisma.user.findUnique({
        where: { id: userId },
        include: { address: true },
      });
    let distanceKm: number | null = null;
    if (
      restaurant?.address?.latitude &&
      restaurant?.address?.longitude &&
      user?.address?.latitude &&
      user?.address?.longitude
    ) {
      distanceKm = haversineDistanceKm(
        Number(user.address.latitude),
        Number(user.address.longitude),
        Number(restaurant.address.latitude),
        Number(restaurant.address.longitude),
      );
    }
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
      distanceKm,
    });
    await this.cartRepo.updateTotals(
      cartId,
      totals,
    );
    const updated =
      await this.prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          items: { include: { menuItem: true } },
          restaurant: true,
        },
      });
    return updated
      ? CartEntity.fromPrisma(
        updated as any,
      ).toView()
      : null;
  }

  private async isGuest(userId: string) {
    return this.guestUserService.isGuest(userId);
  }
}
