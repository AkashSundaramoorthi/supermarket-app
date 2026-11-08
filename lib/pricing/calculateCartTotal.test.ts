import { describe, expect, it } from "vitest";
import { calculateCartTotal } from "./calculateCartTotal";

describe("calculateCartTotal", () => {
  it("returns zeros for an empty cart", () => {
    expect(calculateCartTotal({ lines: [], fulfilment: "pickup", deliveryFeePaise: 2500 })).toEqual({
      subtotalPaise: 0,
      deliveryFeePaise: 0,
      tipPaise: 0,
      totalPaise: 0,
    });
  });

  it("sums unit price times quantity", () => {
    const total = calculateCartTotal({
      lines: [
        { unitPricePaise: 4500, qty: 2 },
        { unitPricePaise: 1250, qty: 1 },
      ],
      fulfilment: "pickup",
      deliveryFeePaise: 2500,
    });
    expect(total.subtotalPaise).toBe(10250);
    expect(total.totalPaise).toBe(10250);
  });

  it("adds the delivery fee and tip for delivery", () => {
    const total = calculateCartTotal({
      lines: [{ unitPricePaise: 10000, qty: 1 }],
      fulfilment: "delivery",
      deliveryFeePaise: 2500,
      tipPaise: 1000,
    });
    expect(total).toEqual({ subtotalPaise: 10000, deliveryFeePaise: 2500, tipPaise: 1000, totalPaise: 13500 });
  });

  it("charges no delivery fee or tip for pickup", () => {
    const total = calculateCartTotal({
      lines: [{ unitPricePaise: 10000, qty: 1 }],
      fulfilment: "pickup",
      deliveryFeePaise: 2500,
      tipPaise: 1000,
    });
    expect(total.deliveryFeePaise).toBe(0);
    expect(total.tipPaise).toBe(0);
    expect(total.totalPaise).toBe(10000);
  });
});
