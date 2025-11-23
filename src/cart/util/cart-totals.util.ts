// Shared cart totals computation to eliminate duplication between user and guest carts.
// Converts all numeric-like fields to numbers and applies delivery fee + tax.

export interface CartTotalsItem {
  unitPrice: any; // Decimal | string | number
  quantity: number;
}

export interface CartRestaurantPricing {
  handlingFee?: any; // Decimal | string | number
  packagingCharges?: any; // Decimal | string | number
}

export interface ComputeCartTotalsOptions {
  items: CartTotalsItem[];
  restaurant?: CartRestaurantPricing | null;
  deliveryFlatFee?: number; // defaults from env DELIVERY_FLAT_FEE or 20
  taxRate?: number; // defaults from env TAX_RATE or 0.05
}

export interface CartTotalsResult {
  subtotal: number;
  handlingFee: number;
  packagingCharges: number;
  deliveryCharges: number;
  taxAmount: number;
  total: number;
}

export function computeCartTotals(
  options: ComputeCartTotalsOptions,
): CartTotalsResult {
  const {
    items,
    restaurant,
    deliveryFlatFee = Number(
      process.env.DELIVERY_FLAT_FEE ?? 20,
    ),
    taxRate = Number(process.env.TAX_RATE ?? 0.05),
  } = options;

  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.unitPrice) * it.quantity,
    0,
  );

  const handlingFee = Number(
    restaurant?.handlingFee ?? 0,
  );
  const packagingCharges = Number(
    restaurant?.packagingCharges ?? 0,
  );
  const deliveryCharges = restaurant ? deliveryFlatFee : 0;
  const taxAmount = restaurant
    ? Number((subtotal * taxRate).toFixed(2))
    : 0;
  const total =
    subtotal +
    handlingFee +
    packagingCharges +
    deliveryCharges +
    taxAmount;

  return {
    subtotal,
    handlingFee,
    packagingCharges,
    deliveryCharges,
    taxAmount,
    total,
  };
}
