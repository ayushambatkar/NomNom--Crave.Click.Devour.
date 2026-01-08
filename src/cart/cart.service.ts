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

/**
 * CartService - Shopping cart management with restaurant consistency.
 *
 * @description Handles all cart operations for registered users:
 * - One cart per user (upsert pattern)
 * - Single restaurant per cart (auto-resets on cross-restaurant add)
 * - Dynamic totals calculation with delivery fees
 *
 * Note: Guests cannot access cart - must register first.
 */
@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    // private guestCart: GuestCartService,
    private readonly cartRepo: CartRepository,
    private readonly guestUserService: GuestUserService,
  ) {}

  /**
   * Get user's cart with items and calculated totals.
   *
   * @description
   * - Returns cart transformed via CartEntity.toView()
   * - Includes restaurant info, items with menuItem details
   * - Includes calculated totals (subtotal, fees, tax, delivery, total)
   *
   * @param userId - The ID of the user
   * @returns CartView object or null if no cart exists
   * @throws HttpException 401 if user is a guest
   */
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

  /**
   * Clear all items from user's cart.
   *
   * @description
   * - Removes all CartItems from the cart
   * - Resets all totals to zero
   * - Does NOT remove the cart itself
   *
   * @param userId - The ID of the user
   * @returns Updated (empty) cart view
   * @throws HttpException 401 if user is a guest
   */
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

  /**
   * Add item to cart with restaurant consistency check.
   *
   * @description Flow:
   * 1. Validate user is not a guest
   * 2. Find menu item and validate exists
   * 3. Ensure cart exists for user
   * 4. Restaurant consistency check:
   *    - If cart has different restaurant: clear cart, switch restaurant
   *    - If cart empty: set restaurant
   *    - If same restaurant: continue
   * 5. Add new item or increment existing item quantity
   * 6. Recalculate all totals (subtotal, fees, tax, delivery)
   *
   * Totals Calculation:
   * - subtotal = Σ(unitPrice × quantity)
   * - handlingFee = restaurant.handlingFee
   * - packagingCharges = restaurant.packagingCharges
   * - deliveryCharges = ceil(distanceKm) × PER_KM_RATE (₹10/km)
   * - taxAmount = subtotal × TAX_RATE (5%)
   * - total = sum of all above
   *
   * @param userId - The ID of the user
   * @param menuItemId - The UUID of the menu item to add
   * @param quantity - Number of items to add (default: 1)
   * @returns Updated cart view with recalculated totals
   * @throws HttpException 401 if user is a guest
   * @throws NotFoundException if menu item not found
   * @throws BadRequestException if quantity < 1
   */
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
        await this.cartRepo.clearCart(cart.id);
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

  /**
   * Remove an item completely from cart.
   *
   * @description
   * - Deletes the CartItem record entirely
   * - Recalculates totals after removal
   * - No-op if item not in cart (returns current cart)
   *
   * @param userId - The ID of the user
   * @param menuItemId - The UUID of the menu item to remove
   * @returns Updated cart view
   * @throws HttpException 401 if user is a guest
   */
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

  /**
   * Decrease item quantity in cart.
   *
   * @description
   * - Reduces quantity by specified amount
   * - If new quantity would be 0: removes item entirely
   * - Recalculates totals after update
   *
   * @param userId - The ID of the user
   * @param menuItemId - The UUID of the menu item
   * @param quantity - Amount to decrement (default: 1)
   * @returns Updated cart view
   * @throws BadRequestException if quantity < 1
   * @throws NotFoundException if item not in cart
   */
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
        return this.removeItem(
          userId,
          menuItemId,
        );
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

  /**
   * Ensure cart exists for user (upsert pattern).
   *
   * @description Creates cart if not exists, returns existing otherwise.
   * @private
   * @param userId - The ID of the user
   * @returns Cart record
   * @throws HttpException 401 if user is a guest
   */
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

  /**
   * Public wrapper for ensureCart - used by AuthService.
   *
   * @description Called during guest upgrade to ensure cart exists
   * for the newly registered user.
   *
   * @param userId - The ID of the user
   * @returns Cart record
   */
  async ensureCartForUser(userId: string) {
    return this.ensureCart(userId);
  }

  /**
   * Recalculate and persist cart totals.
   *
   * @description Calculates all cart fees:
   * 1. Fetch cart items from DB
   * 2. Get restaurant with address for fees
   * 3. Get user with address for delivery distance
   * 4. Calculate distance via Haversine formula
   * 5. Compute totals: subtotal, handlingFee, packagingCharges, deliveryCharges, tax
   * 6. Persist totals to cart record
   * 7. Return updated cart view
   *
   * Formula:
   * - deliveryCharges = ceil(distanceKm) × PER_KM_RATE
   * - taxAmount = subtotal × TAX_RATE
   * - total = subtotal + handlingFee + packagingCharges + deliveryCharges + taxAmount
   *
   * @private
   * @param cartId - The UUID of the cart
   * @param userId - The ID of the user (for address lookup)
   * @param restaurantId - The UUID of the restaurant (for fees)
   * @returns Updated cart view or null
   */
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

  /**
   * Check if user is a guest (Redis lookup).
   * @private
   */
  private async isGuest(userId: string) {
    return this.guestUserService.isGuest(userId);
  }
}
