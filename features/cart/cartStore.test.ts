import { beforeEach, describe, expect, it } from "vitest";
import { MAX_QTY_PER_ITEM, useCartStore } from "./cartStore";

const milk = { productId: "p1", name: "Milk 1 L", unit: "1 L", unitPricePaise: 6500 };
const bread = { productId: "p2", name: "Bread", unit: "400 g", unitPricePaise: 4000 };

describe("cart store", () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({ items: [] });
  });

  it("adds a new product with quantity 1", () => {
    useCartStore.getState().addItem(milk);
    expect(useCartStore.getState().items).toEqual([{ ...milk, qty: 1 }]);
  });

  it("increments quantity when the same product is added again", () => {
    const { addItem } = useCartStore.getState();
    addItem(milk);
    addItem(milk);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].qty).toBe(2);
  });

  it("caps quantity per item", () => {
    useCartStore.getState().addItem(milk);
    useCartStore.getState().setQty(milk.productId, 999);
    expect(useCartStore.getState().items[0].qty).toBe(MAX_QTY_PER_ITEM);
  });

  it("removes a line when quantity is set to zero", () => {
    const { addItem, setQty } = useCartStore.getState();
    addItem(milk);
    addItem(bread);
    setQty(milk.productId, 0);
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(["p2"]);
  });

  it("clears all lines", () => {
    const { addItem, clear } = useCartStore.getState();
    addItem(milk);
    addItem(bread);
    clear();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("persists items to localStorage under cart-v1", () => {
    useCartStore.getState().addItem(milk);
    const stored = JSON.parse(localStorage.getItem("cart-v1") ?? "{}");
    expect(stored.state.items).toEqual([{ ...milk, qty: 1 }]);
  });
});
