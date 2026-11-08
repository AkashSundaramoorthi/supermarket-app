import { describe, expect, it } from "vitest";
import { canTransition, ORDER_STATUSES, type OrderStatus } from "./stateMachine";

const pickup = { fulfilment: "pickup", wasPaid: true } as const;
const delivery = { fulfilment: "delivery", wasPaid: true } as const;

describe("canTransition", () => {
  it.each<[OrderStatus, OrderStatus]>([
    ["pending_payment", "paid"],
    ["pending_payment", "cancelled"],
    ["paid", "received"],
    ["paid", "cancelled"],
    ["received", "packed"],
    ["received", "cancelled"],
    ["ready_for_pickup", "collected"],
    ["out_for_delivery", "delivered"],
    ["cancelled", "refunded"],
  ])("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to, pickup)).toBe(true);
  });

  it.each<[OrderStatus, OrderStatus]>([
    ["pending_payment", "received"],
    ["pending_payment", "refunded"],
    ["paid", "packed"],
    ["received", "collected"],
    ["ready_for_pickup", "cancelled"],
    ["collected", "cancelled"],
    ["delivered", "refunded"],
    ["refunded", "paid"],
  ])("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to, pickup)).toBe(false);
  });

  it("sends pickup orders to ready_for_pickup and not out_for_delivery", () => {
    expect(canTransition("packed", "ready_for_pickup", pickup)).toBe(true);
    expect(canTransition("packed", "out_for_delivery", pickup)).toBe(false);
  });

  it("sends delivery orders to out_for_delivery and not ready_for_pickup", () => {
    expect(canTransition("packed", "out_for_delivery", delivery)).toBe(true);
    expect(canTransition("packed", "ready_for_pickup", delivery)).toBe(false);
  });

  it("refunds only a cancelled order that was paid", () => {
    expect(canTransition("cancelled", "refunded", { fulfilment: "pickup", wasPaid: false })).toBe(false);
  });

  it("has no transitions out of terminal states", () => {
    for (const from of ["collected", "delivered", "refunded"] as const) {
      for (const to of ORDER_STATUSES) {
        expect(canTransition(from, to, pickup)).toBe(false);
      }
    }
  });
});
