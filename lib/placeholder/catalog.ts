export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  unit: string;
  unitPricePaise: number;
  mrpPaise: number;
  description: string;
  image?: string;
  badge?: string;
  isVeg?: boolean;
  calories?: string;
};

export const store = {
  id: "store-1",
  name: "FreshMart Supermarket",
  address: "Main Market Avenue, City Center",
  pickupEtaMinutes: 15,
  deliveryEtaMinutes: 15,
  deliveryFeePaise: 2500,
  minFreeDeliveryPaise: 19900, // Free delivery above ₹199
  phone: "+91 98765 43210",
  timings: "7:00 AM – 11:30 PM",
};

export const categories: Category[] = [
  { id: "c-produce", name: "Fresh Produce", icon: "🥦" },
  { id: "c-dairy", name: "Dairy & Eggs", icon: "🥛" },
  { id: "c-instant", name: "Instant & Noodles", icon: "🍜" },
  { id: "c-snacks", name: "Snacks & Munchies", icon: "🥨" },
  { id: "c-drinks", name: "Drinks & Juices", icon: "🧃" },
  { id: "c-essentials", name: "Daily Essentials", icon: "🧼" },
];

export const products: Product[] = [
  // Produce
  {
    id: "p-1",
    categoryId: "c-produce",
    name: "Robusta Fresh Bananas",
    unit: "1 dozen (~1.2 kg)",
    unitPricePaise: 4900,
    mrpPaise: 6500,
    description: "Naturally ripened, nutrient-rich sweet yellow bananas. Great source of potassium and sustained energy.",
    image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80",
    badge: "25% OFF",
    isVeg: true,
    calories: "89 kcal/100g",
  },
  {
    id: "p-2",
    categoryId: "c-produce",
    name: "Farm Fresh Hybrid Tomatoes",
    unit: "500 g",
    unitPricePaise: 3200,
    mrpPaise: 4000,
    description: "Firm, glossy red tomatoes handpicked from local farms. Perfect for curries, salads, and pastas.",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80",
    badge: "Fresh Pick",
    isVeg: true,
    calories: "18 kcal/100g",
  },
  {
    id: "p-3",
    categoryId: "c-produce",
    name: "Nashik Red Onions",
    unit: "1 kg",
    unitPricePaise: 4500,
    mrpPaise: 5500,
    description: "Crisp and pungent premium quality onions with high shelf-life. An essential base for everyday cooking.",
    image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=400&q=80",
    badge: "18% OFF",
    isVeg: true,
    calories: "40 kcal/100g",
  },
  {
    id: "p-11",
    categoryId: "c-produce",
    name: "Fresh Crisp Apples (Himachal)",
    unit: "4 pcs (~600 g)",
    unitPricePaise: 9900,
    mrpPaise: 13000,
    description: "Juicy, crisp, sweet Himachal red apples loaded with antioxidants and dietary fiber.",
    image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80",
    badge: "Popular",
    isVeg: true,
    calories: "52 kcal/100g",
  },

  // Dairy & Eggs
  {
    id: "p-4",
    categoryId: "c-dairy",
    name: "Pasteurized Full Cream Milk",
    unit: "1 L Pouch",
    unitPricePaise: 6500,
    mrpPaise: 6800,
    description: "Rich, wholesome whole milk homogenized and pasteurized. Packed with calcium and essential vitamins.",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80",
    badge: "Daily Essential",
    isVeg: true,
    calories: "62 kcal/100ml",
  },
  {
    id: "p-5",
    categoryId: "c-dairy",
    name: "Farm Fresh Brown Eggs",
    unit: "12 pcs pack",
    unitPricePaise: 9500,
    mrpPaise: 11000,
    description: "Naturally laid, high-protein eggs with sturdy shells and rich yolks from healthy hens.",
    image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80",
    badge: "Best Seller",
    isVeg: false,
    calories: "72 kcal/egg",
  },
  {
    id: "p-6",
    categoryId: "c-dairy",
    name: "Malai Fresh Cottage Paneer",
    unit: "200 g block",
    unitPricePaise: 9900,
    mrpPaise: 11500,
    description: "Soft, succulent paneer made from pure cow milk. Ideal for paneer tikka, bhurji, or curries.",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80",
    badge: "14% OFF",
    isVeg: true,
    calories: "265 kcal/100g",
  },
  {
    id: "p-12",
    categoryId: "c-dairy",
    name: "Salted Butter Block",
    unit: "100 g",
    unitPricePaise: 5400,
    mrpPaise: 6000,
    description: "Creamy golden salted butter. Spreads smoothly on warm toasts, parathas, and dosas.",
    image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80",
    badge: "Breakfast",
    isVeg: true,
    calories: "717 kcal/100g",
  },

  // Instant Food
  {
    id: "p-13",
    categoryId: "c-instant",
    name: "Classic Masala 2-Min Noodles",
    unit: "4 x 70 g Multipack",
    unitPricePaise: 5600,
    mrpPaise: 6000,
    description: "Everyone's favorite midnight snack. Made with signature roast spices for comforting instant noodles.",
    image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80",
    badge: "Student Favorite",
    isVeg: true,
    calories: "380 kcal/pack",
  },
  {
    id: "p-14",
    categoryId: "c-instant",
    name: "Spicy Korean Hot Chicken Noodles",
    unit: "140 g Bowl",
    unitPricePaise: 13500,
    mrpPaise: 16000,
    description: "Extra spicy, fiery ramen with chewy noodles and umami chili sauce. Popular fiery spicy bowl.",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80",
    badge: "Trending 🔥",
    isVeg: true,
    calories: "530 kcal/bowl",
  },
  {
    id: "p-15",
    categoryId: "c-instant",
    name: "Ready-to-Eat Dal Makhani",
    unit: "300 g Meal Pouch",
    unitPricePaise: 9900,
    mrpPaise: 12000,
    description: "Slow-cooked black lentils in creamy butter gravy. Microwave or boil in pouch for 3 minutes.",
    image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80",
    badge: "Instant Meal",
    isVeg: true,
    calories: "320 kcal/pouch",
  },

  // Snacks & Munchies
  {
    id: "p-7",
    categoryId: "c-snacks",
    name: "Classic Salted Crispy Chips",
    unit: "100 g bag",
    unitPricePaise: 2000,
    mrpPaise: 2500,
    description: "Crispy thinly sliced golden potato chips seasoned with fine rock salt. Gluten-free and light.",
    image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80",
    badge: "Crunchy",
    isVeg: true,
    calories: "536 kcal/100g",
  },
  {
    id: "p-8",
    categoryId: "c-snacks",
    name: "Artisan 70% Dark Chocolate",
    unit: "90 g bar",
    unitPricePaise: 15000,
    mrpPaise: 18000,
    description: "Rich, velvety Belgian cocoa dark chocolate with balanced bitterness and lingering vanilla aroma.",
    image: "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=400&q=80",
    badge: "Sweet Treat",
    isVeg: true,
    calories: "598 kcal/100g",
  },
  {
    id: "p-16",
    categoryId: "c-snacks",
    name: "Roasted Salted California Almonds",
    unit: "200 g pack",
    unitPricePaise: 19900,
    mrpPaise: 24000,
    description: "Slow-roasted premium crunchy almonds seasoned with sea salt. Brain food for long study sessions.",
    image: "https://images.unsplash.com/photo-1508061252224-203a2300478a?auto=format&fit=crop&w=400&q=80",
    badge: "Healthy",
    isVeg: true,
    calories: "579 kcal/100g",
  },

  // Drinks & Beverages
  {
    id: "p-9",
    categoryId: "c-drinks",
    name: "100% Squeezed Valencia Orange Juice",
    unit: "1 L Bottle",
    unitPricePaise: 12000,
    mrpPaise: 14500,
    description: "No added sugar or preservatives. Pure vitamin C boost made directly from sun-ripened oranges.",
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80",
    badge: "No Added Sugar",
    isVeg: true,
    calories: "45 kcal/100ml",
  },
  {
    id: "p-10",
    categoryId: "c-drinks",
    name: "Himalayan Mineral Spring Water",
    unit: "1 L Bottle",
    unitPricePaise: 2000,
    mrpPaise: 2500,
    description: "Naturally purified mountain spring water infused with essential minerals and neutral pH.",
    image: "https://images.unsplash.com/photo-1559839914-ba2ae6b7c538?auto=format&fit=crop&w=400&q=80",
    badge: "Chilled",
    isVeg: true,
    calories: "0 kcal",
  },
  {
    id: "p-17",
    categoryId: "c-drinks",
    name: "Cold Brew Iced Coffee (Vanilla)",
    unit: "250 ml Can",
    unitPricePaise: 8500,
    mrpPaise: 10000,
    description: "Smooth 18-hour cold brew Arabica coffee with a hint of Madagascar vanilla. Quick study caffeine kick.",
    image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=400&q=80",
    badge: "Energizing ⚡",
    isVeg: true,
    calories: "90 kcal/can",
  },

  // Daily Essentials
  {
    id: "p-18",
    categoryId: "c-essentials",
    name: "Ultra Soft Facial & Pocket Tissues",
    unit: "Pack of 3 (100 pulls each)",
    unitPricePaise: 11000,
    mrpPaise: 14000,
    description: "Gentle 3-ply 100% virgin pulp facial tissues. Highly absorbent and hypoallergenic.",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80",
    badge: "Value Pack",
    isVeg: true,
  },
  {
    id: "p-19",
    categoryId: "c-essentials",
    name: "Gentle Foaming Antibacterial Handwash",
    unit: "250 ml Pump",
    unitPricePaise: 8900,
    mrpPaise: 11000,
    description: "Kills 99.9% germs while keeping hands moisturized with aloe vera and vitamin E extracts.",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80",
    badge: "Germ Shield",
    isVeg: true,
  },
];

export function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
