export type Fulfilment = "pickup" | "delivery";

export type PricedLine = { unitPricePaise: number; qty: number };

export type CartTotal = {
  subtotalPaise: number;
  deliveryFeePaise: number;
  tipPaise: number;
  totalPaise: number;
};

export function calculateCartTotal({
  lines,
  fulfilment,
  deliveryFeePaise,
  tipPaise = 0,
}: {
  lines: PricedLine[];
  fulfilment: Fulfilment;
  deliveryFeePaise: number;
  tipPaise?: number;
}): CartTotal {
  const subtotalPaise = lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0);
  const shippingPaise = fulfilment === "delivery" ? deliveryFeePaise : 0;
  const tip = fulfilment === "delivery" ? tipPaise : 0;
  return {
    subtotalPaise,
    deliveryFeePaise: shippingPaise,
    tipPaise: tip,
    totalPaise: subtotalPaise + shippingPaise + tip,
  };
}
