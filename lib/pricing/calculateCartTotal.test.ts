import { describe, expect, it } from "vitest";
import { calculateCartTotal } from "./calculateCartTotal";

describe("calculateCartTotal", () => {
  it("returns zeros for an empty cart", () => {
    expect(
      calculateCartTotal({ lines: [], isStudent: false, fulfilment: "pickup", deliveryFeePaise: 2500 }),
    ).toEqual({ subtotalPaise: 0, discountPaise: 0, deliveryFeePaise: 0, totalPaise: 0 });
  });

  it("sums unit price times quantity", () => {
    const total = calculateCartTotal({
      lines: [
        { unitPricePaise: 4500, qty: 2 },
        { unitPricePaise: 1250, qty: 1 },
      ],
      isStudent: false,
      fulfilment: "pickup",
      deliveryFeePaise: 2500,
    });
    expect(total.subtotalPaise).toBe(10250);
    expect(total.totalPaise).toBe(10250);
  });

  it("applies 10% student discount on the subtotal, rounded to the paisa", () => {
    const total = calculateCartTotal({
      lines: [{ unitPricePaise: 1005, qty: 1 }],
      isStudent: true,
      fulfilment: "pickup",
      deliveryFeePaise: 0,
    });
    expect(total.discountPaise).toBe(101);
    expect(total.totalPaise).toBe(904);
  });

  it("adds the delivery fee for delivery and never discounts it", () => {
    const total = calculateCartTotal({
      lines: [{ unitPricePaise: 10000, qty: 1 }],
      isStudent: true,
      fulfilment: "delivery",
      deliveryFeePaise: 2500,
    });
    expect(total).toEqual({
      subtotalPaise: 10000,
      discountPaise: 1000,
      deliveryFeePaise: 2500,
      totalPaise: 11500,
    });
  });

  it("charges no delivery fee for pickup", () => {
    const total = calculateCartTotal({
      lines: [{ unitPricePaise: 10000, qty: 1 }],
      isStudent: false,
      fulfilment: "pickup",
      deliveryFeePaise: 2500,
    });
    expect(total.deliveryFeePaise).toBe(0);
    expect(total.totalPaise).toBe(10000);
  });
});
