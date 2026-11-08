export type Fulfilment = "pickup" | "delivery";

export type PricedLine = { unitPricePaise: number; qty: number };

export type CartTotal = {
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
};

export const STUDENT_DISCOUNT_RATE = 0.1;

export function calculateCartTotal({
  lines,
  isStudent,
  fulfilment,
  deliveryFeePaise,
}: {
  lines: PricedLine[];
  isStudent: boolean;
  fulfilment: Fulfilment;
  deliveryFeePaise: number;
}): CartTotal {
  const subtotalPaise = lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0);
  const discountPaise = isStudent ? Math.round(subtotalPaise * STUDENT_DISCOUNT_RATE) : 0;
  const shippingPaise = fulfilment === "delivery" ? deliveryFeePaise : 0;
  return {
    subtotalPaise,
    discountPaise,
    deliveryFeePaise: shippingPaise,
    totalPaise: subtotalPaise - discountPaise + shippingPaise,
  };
}
