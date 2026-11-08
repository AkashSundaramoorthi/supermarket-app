export type Category = { id: string; name: string };

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  unit: string;
  unitPricePaise: number;
  mrpPaise: number;
  description: string;
};

export const store = {
  id: "store-1",
  name: "Campus Fresh Market",
  address: "Gate 2, College Road",
  pickupEtaMinutes: 15,
  deliveryFeePaise: 2500,
};

export const categories: Category[] = [
  { id: "c-produce", name: "Fruit and veg" },
  { id: "c-dairy", name: "Dairy and eggs" },
  { id: "c-snacks", name: "Snacks" },
  { id: "c-drinks", name: "Drinks" },
];

const DUMMY = "Dummy data. Not a real price.";

export const products: Product[] = [
  { id: "p-1", categoryId: "c-produce", name: "Bananas", unit: "1 dozen", unitPricePaise: 4900, mrpPaise: 5500, description: DUMMY },
  { id: "p-2", categoryId: "c-produce", name: "Tomatoes", unit: "500 g", unitPricePaise: 3200, mrpPaise: 3500, description: DUMMY },
  { id: "p-3", categoryId: "c-produce", name: "Onions", unit: "1 kg", unitPricePaise: 4500, mrpPaise: 4800, description: DUMMY },
  { id: "p-4", categoryId: "c-dairy", name: "Full cream milk", unit: "1 L", unitPricePaise: 6500, mrpPaise: 6800, description: DUMMY },
  { id: "p-5", categoryId: "c-dairy", name: "Eggs", unit: "12 pack", unitPricePaise: 9500, mrpPaise: 10200, description: DUMMY },
  { id: "p-6", categoryId: "c-dairy", name: "Paneer", unit: "200 g", unitPricePaise: 9900, mrpPaise: 10500, description: DUMMY },
  { id: "p-7", categoryId: "c-snacks", name: "Salted chips", unit: "100 g", unitPricePaise: 2000, mrpPaise: 2200, description: DUMMY },
  { id: "p-8", categoryId: "c-snacks", name: "Dark chocolate", unit: "90 g", unitPricePaise: 15000, mrpPaise: 16500, description: DUMMY },
  { id: "p-9", categoryId: "c-drinks", name: "Orange juice", unit: "1 L", unitPricePaise: 12000, mrpPaise: 13500, description: DUMMY },
  { id: "p-10", categoryId: "c-drinks", name: "Mineral water", unit: "1 L", unitPricePaise: 2000, mrpPaise: 2200, description: DUMMY },
];

export function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
