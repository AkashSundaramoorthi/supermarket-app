import { products } from "@/lib/placeholder/catalog";
import { placeholderOrders, type PlaceholderOrder } from "@/lib/placeholder/orders";

export interface CategoryBreakdown {
  id: string;
  name: string;
  orderCount: number;
  revenuePaise: number;
  percentage: number;
}

export interface InventoryAlert {
  productId: string;
  name: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  urgency: "critical" | "warning" | "healthy";
  action: string;
}

export interface PromotionRecommendation {
  id: string;
  title: string;
  tag: string;
  icon: string;
  expectedUpside: string;
  rationale: string;
  suggestedDiscount: string;
  targetItems: string[];
  status: "ready" | "active";
}

export interface DemandSurge {
  timeSlot: string;
  predictedDemand: "High 🔥" | "Moderate ⚡" | "Normal 🛒";
  dominantCategory: string;
  suggestedAction: string;
}

export function computeAdminAnalytics(orders: PlaceholderOrder[]) {
  const allOrders = orders.length > 0 ? orders : placeholderOrders;

  // 1. Core KPIs
  const totalOrders = allOrders.length;
  const completedOrders = allOrders.filter(
    (o) => o.status === "delivered" || o.status === "collected",
  );
  const activeOrders = allOrders.filter(
    (o) =>
      o.status !== "delivered" &&
      o.status !== "collected" &&
      o.status !== "cancelled" &&
      o.status !== "refunded",
  );

  const grossRevenuePaise = allOrders.reduce((sum, o) => sum + o.totalPaise, 0);
  const aovPaise = totalOrders > 0 ? Math.round(grossRevenuePaise / totalOrders) : 0;

  const pickupCount = allOrders.filter((o) => o.fulfilment === "pickup").length;
  const deliveryCount = allOrders.filter((o) => o.fulfilment === "delivery").length;

  const upiCount = allOrders.filter((o) => o.paymentMethod === "upi").length;
  const codCount = allOrders.filter((o) => o.paymentMethod === "cod").length;
  const cardCount = allOrders.filter((o) => o.paymentMethod === "card").length;

  // 2. Product Velocity & Demand Stats
  const productSalesMap = new Map<string, { name: string; qty: number; revenuePaise: number }>();

  // Extract from item snapshots or simulate from product catalog
  allOrders.forEach((o) => {
    if (o.items && o.items.length > 0) {
      o.items.forEach((item) => {
        const cur = productSalesMap.get(item.name) || {
          name: item.name,
          qty: 0,
          revenuePaise: 0,
        };
        cur.qty += item.qty;
        cur.revenuePaise += item.qty * item.unitPricePaise;
        productSalesMap.set(item.name, cur);
      });
    }
  });

  // Seed standard products if orders were few
  products.forEach((p, idx) => {
    if (!productSalesMap.has(p.name)) {
      const simulatedQty = Math.max(2, (15 - idx) * 3);
      productSalesMap.set(p.name, {
        name: p.name,
        qty: simulatedQty,
        revenuePaise: simulatedQty * p.unitPricePaise,
      });
    }
  });

  const sortedProducts = Array.from(productSalesMap.values()).sort((a, b) => b.qty - a.qty);

  // 3. Inventory Health & Supply Warnings
  const inventoryAlerts: InventoryAlert[] = [
    {
      productId: "p-4",
      name: "Pasteurized Full Cream Milk (1 L)",
      unit: "1 L Pouch",
      currentStock: 12,
      reorderLevel: 30,
      urgency: "critical",
      action: "Order 50 units immediately from Dairy supplier. Run-out expected in ~4 hours.",
    },
    {
      productId: "p-13",
      name: "Classic Masala 2-Min Noodles",
      unit: "4 x 70 g Multipack",
      currentStock: 18,
      reorderLevel: 40,
      urgency: "critical",
      action: "High evening hostel demand anticipated. Restock 60 packs before 6 PM.",
    },
    {
      productId: "p-5",
      name: "Farm Fresh Brown Eggs (12 pack)",
      unit: "12 pcs pack",
      currentStock: 22,
      reorderLevel: 25,
      urgency: "warning",
      action: "Steady consumption. Schedule fresh replenishment by tomorrow 8 AM.",
    },
    {
      productId: "p-1",
      name: "Robusta Fresh Bananas",
      unit: "1 dozen",
      currentStock: 48,
      reorderLevel: 15,
      urgency: "healthy",
      action: "High stock. Recommend flash promotion to prevent over-ripening/spoilage.",
    },
    {
      productId: "p-10",
      name: "Himalayan Mineral Spring Water",
      unit: "1 L Bottle",
      currentStock: 65,
      reorderLevel: 20,
      urgency: "healthy",
      action: "Sufficient inventory for 3+ days.",
    },
  ];

  // 4. Strategic Promotions & Marketing Plans ("What to promote next")
  const promotionPlans: PromotionRecommendation[] = [
    {
      id: "promo-1",
      title: "Late-Night Cravings Snack Bundle",
      tag: "High Demand Surge",
      icon: "🍜",
      expectedUpside: "+₹14,500/night",
      rationale:
        "Instant Noodles and Cold Brew Coffee traffic spikes by 340% between 10:30 PM and 1:30 AM.",
      suggestedDiscount: "10% Combo Discount with code NIGHT10",
      targetItems: ["Classic Masala 2-Min Noodles", "Cold Brew Iced Coffee (Vanilla)"],
      status: "ready",
    },
    {
      id: "promo-2",
      title: "Fresh Morning Breakfast Booster",
      tag: "Fresh Supply Run",
      icon: "🥛",
      expectedUpside: "+₹18,200/morning",
      rationale:
        "Dairy & Eggs have high basket frequency between 7:30 AM and 10:00 AM. Bundle Milk + Eggs + Butter to increase Average Order Value.",
      suggestedDiscount: "Free doorstep delivery on orders above ₹149",
      targetItems: ["Full Cream Milk", "Brown Eggs", "Salted Butter Block"],
      status: "ready",
    },
    {
      id: "promo-3",
      title: "Perishable Produce Flash Clearance",
      tag: "Spoilage Prevention",
      icon: "🥦",
      expectedUpside: "Saves ₹3,800 in spoilage",
      rationale:
        "High stock of Bananas and Farm Tomatoes currently sitting in inventory. A midday push clears shelves before tomorrow morning's fresh harvest shipment.",
      suggestedDiscount: "Flat 20% OFF produce after 2:00 PM",
      targetItems: ["Robusta Fresh Bananas", "Farm Fresh Hybrid Tomatoes"],
      status: "active",
    },
    {
      id: "promo-4",
      title: "Sports & Gym Hydration Drive",
      tag: "Fitness & Wellness",
      icon: "⚡",
      expectedUpside: "+₹8,900/day",
      rationale:
        "Peak evening workout hours (4:30 PM - 7:30 PM). Promote 100% Valencia Orange Juice and Mineral Spring Water.",
      suggestedDiscount: "Buy 2 Get 10% OFF Beverages",
      targetItems: ["Valencia Orange Juice", "Himalayan Mineral Spring Water"],
      status: "ready",
    },
  ];

  // 5. Demand Surge Clock
  const demandSurges: DemandSurge[] = [
    {
      timeSlot: "07:30 AM – 10:30 AM",
      predictedDemand: "High 🔥",
      dominantCategory: "Dairy, Eggs & Fresh Produce",
      suggestedAction: "Ensure store staff is ready for morning grocery rush.",
    },
    {
      timeSlot: "12:00 PM – 02:30 PM",
      predictedDemand: "Moderate ⚡",
      dominantCategory: "Ready-to-eat Meals & Cold Juices",
      suggestedAction: "Stage pre-chilled beverages at front display.",
    },
    {
      timeSlot: "05:00 PM – 07:30 PM",
      predictedDemand: "Moderate ⚡",
      dominantCategory: "Snacks, Chips & Dark Chocolate",
      suggestedAction: "Keep snack crates easily accessible for quick grab-and-go.",
    },
    {
      timeSlot: "10:00 PM – 01:30 AM",
      predictedDemand: "High 🔥",
      dominantCategory: "Instant Noodles & Canned Coffee",
      suggestedAction: "Pre-pack hostel batch orders to achieve sub-10 minute delivery.",
    },
  ];

  return {
    grossRevenuePaise,
    totalOrders,
    aovPaise,
    activeOrdersCount: activeOrders.length,
    completedOrdersCount: completedOrders.length,
    fulfilment: {
      pickupCount,
      deliveryCount,
      pickupPercentage: totalOrders > 0 ? Math.round((pickupCount / totalOrders) * 100) : 50,
      deliveryPercentage: totalOrders > 0 ? Math.round((deliveryCount / totalOrders) * 100) : 50,
    },
    payments: {
      upi: upiCount,
      cod: codCount,
      card: cardCount,
    },
    topProducts: sortedProducts.slice(0, 6),
    inventoryAlerts,
    promotionPlans,
    demandSurges,
    allOrders,
  };
}
