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
];

export const products: Product[] = [
  { id: "p-1", categoryId: "c-produce", name: "Bananas", unit: "1 dozen", unitPricePaise: 4900, mrpPaise: 5500, description: "Ripe, sold by the dozen." },
  { id: "p-2", categoryId: "c-produce", name: "Tomatoes", unit: "500 g", unitPricePaise: 3200, mrpPaise: 3500, description: "Firm, locally grown." },
  { id: "p-3", categoryId: "c-produce", name: "Onions", unit: "1 kg", unitPricePaise: 4500, mrpPaise: 4800, description: "Red onions, medium size." },
  { id: "p-4", categoryId: "c-dairy", name: "Full cream milk", unit: "1 L", unitPricePaise: 6500, mrpPaise: 6800, description: "Pasteurised, full cream." },
  { id: "p-5", categoryId: "c-dairy", name: "Eggs", unit: "12 pack", unitPricePaise: 9500, mrpPaise: 10200, description: "Free range, medium." },
  { id: "p-6", categoryId: "c-dairy", name: "Paneer", unit: "200 g", unitPricePaise: 9900, mrpPaise: 10500, description: "Soft, fresh paneer block." },
  { id: "p-7", categoryId: "c-snacks", name: "Salted chips", unit: "100 g", unitPricePaise: 2000, mrpPaise: 2200, description: "Classic salted, crunchy." },
  { id: "p-8", categoryId: "c-snacks", name: "Dark chocolate", unit: "90 g", unitPricePaise: 15000, mrpPaise: 16500, description: "70 percent cocoa." },
  { id: "p-9", categoryId: "c-snacks", name: "Roasted peanuts", unit: "250 g", unitPricePaise: 11000, mrpPaise: 12000, description: "Lightly salted." },
  { id: "p-10", categoryId: "c-snacks", name: "Oat biscuits", unit: "300 g", unitPricePaise: 8500, mrpPaise: 9000, description: "Wholegrain oat biscuits." },
];

export function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
