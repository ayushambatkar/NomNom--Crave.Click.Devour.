import { Cart, CartItem, MenuItem, Restaurant } from '@prisma/client';

export class CartEntity {
  private constructor(
    private readonly props: Cart & {
      items: (CartItem & { menuItem: MenuItem })[];
      restaurant: Restaurant | null;
    },
  ) {}

  static fromPrisma(
    cart: Cart & {
      items: (CartItem & { menuItem: MenuItem })[];
      restaurant: Restaurant | null;
    },
  ) {
    return new CartEntity(cart);
  }

  toView() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      items: this.props.items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        menuItem: it.menuItem,
      })),
      restaurant: this.props.restaurant,
      subtotal: Number(this.props.subtotal),
      handlingFee: Number(this.props.handlingFee),
      packagingCharges: Number(this.props.packagingCharges),
      deliveryCharges: Number(this.props.deliveryCharges),
      taxAmount: Number(this.props.taxAmount),
      total: Number(this.props.total),
    };
  }
}
