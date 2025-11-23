import { MenuItem, Restaurant } from '@prisma/client';

export interface RawGuestCartItem {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
}

export interface RawGuestCart {
  id: string;
  userId: string;
  items: RawGuestCartItem[];
  restaurantId: string | null;
  subtotal: number;
  handlingFee: number;
  packagingCharges: number;
  deliveryCharges: number;
  taxAmount: number;
  total: number;
}

export class GuestCartEntity {
  private constructor(
    private readonly raw: RawGuestCart,
    private readonly menuItems: MenuItem[],
    private readonly restaurant: Restaurant | null,
  ) {}

  static fromRaw(
    raw: RawGuestCart,
    menuItems: MenuItem[],
    restaurant: Restaurant | null,
  ) {
    return new GuestCartEntity(
      raw,
      menuItems,
      restaurant,
    );
  }

  toView() {
    return {
      id: `cart:guest:${this.raw.userId}`,
      userId: this.raw.userId,
      items: this.raw.items.map((it) => ({
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        menuItem:
          this.menuItems.find(
            (m) => m.id === it.menuItemId,
          ) || null,
      })),
      restaurant: this.restaurant,
      subtotal: this.raw.subtotal,
      handlingFee: this.raw.handlingFee,
      packagingCharges: this.raw.packagingCharges,
      deliveryCharges: this.raw.deliveryCharges,
      taxAmount: this.raw.taxAmount,
      total: this.raw.total,
    };
  }
}
