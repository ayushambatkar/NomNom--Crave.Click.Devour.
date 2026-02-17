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
  // Distance in kilometers between user and restaurant (if available)
  distanceKm?: number | null;
  perKmDeliveryRate?: number; // defaults from env PER_KM_DELIVERY_RATE or 10
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
    distanceKm = null,
    perKmDeliveryRate = Number(
      process.env.PER_KM_DELIVERY_RATE ?? 10,
    ),
    taxRate = Number(
      process.env.TAX_RATE ?? 0.05,
    ),
  } = options;

  const subtotal = items.reduce(
    (sum, it) =>
      sum + Number(it.unitPrice) * it.quantity,
    0,
  );

  const handlingFee = Number(
    restaurant?.handlingFee ?? 0,
  );
  const packagingCharges = Number(
    restaurant?.packagingCharges ?? 0,
  );
  const deliveryCharges =
    restaurant && distanceKm != null
      ? Math.floor(distanceKm * perKmDeliveryRate)
      : 0;
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

// Haversine distance in KM between two latitude/longitude points
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) =>
    (d * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c =
    2 * Math.asin(Math.min(1, Math.sqrt(a)));
  return R * c;
}
