import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateCartTotal, type Fulfilment } from "@/lib/pricing/calculateCartTotal";
import { products, store } from "@/lib/placeholder/catalog";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay/client";

const orderInputSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      qty: z.number().int().min(1).max(20),
    }),
  ).min(1, "Order must contain at least one item"),
  fulfilment: z.enum(["pickup", "delivery"]),
  storeId: z.string().optional(),
  paymentMethod: z.enum(["cod", "upi", "card"]),
  deliveryAddress: z
    .object({
      line: z.string().min(3),
      pincode: z.string().regex(/^\d{6}$/),
    })
    .optional(),
  tipPaise: z.number().int().min(0).max(10000).optional().default(0),
  phone: z.string().optional(),
});

function generateCollectionCode(): string {
  const letters = ["A", "B", "C", "D", "E"];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${letter}${num}`;
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const result = orderInputSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid order payload", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { items: requestedItems, fulfilment, paymentMethod, deliveryAddress, tipPaise, phone } =
      result.data;

    if (fulfilment === "delivery" && !deliveryAddress) {
      return NextResponse.json(
        { error: "Delivery address is required for delivery orders" },
        { status: 422 },
      );
    }

    // SERVER-SIDE REPRICING (Decision D4)
    // Server independently loads current prices and availability from DB / catalog.
    // Client-submitted prices are completely ignored.
    const supabase = createAdminClient();
    let productLookup: Array<{
      id: string;
      name: string;
      unit: string;
      price_paise: number;
    }> = products.map((p) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      price_paise: p.unitPricePaise,
    }));

    if (isSupabaseConfigured()) {
      const { data: dbProducts, error: dbError } = await supabase
        .from("products")
        .select("id, name, price_paise, mrp_paise, unit, active")
        .eq("active", true);

      if (!dbError && dbProducts && dbProducts.length > 0) {
        productLookup = dbProducts.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          price_paise: p.price_paise,
        }));
      }
    }

    // Match items and recompute
    const pricedItems: Array<{
      productId: string;
      name: string;
      unit: string;
      unitPricePaise: number;
      qty: number;
    }> = [];

    const outOfStockOrMissing: string[] = [];

    for (const reqItem of requestedItems) {
      const product = productLookup.find((p) => p.id === reqItem.productId);
      if (!product) {
        outOfStockOrMissing.push(reqItem.productId);
        continue;
      }

      pricedItems.push({
        productId: product.id,
        name: product.name,
        unit: product.unit,
        unitPricePaise: product.price_paise,
        qty: reqItem.qty,
      });
    }

    if (outOfStockOrMissing.length > 0) {
      return NextResponse.json(
        {
          error: "Some items in your cart are no longer available or out of stock",
          invalidProductIds: outOfStockOrMissing,
        },
        { status: 409 },
      );
    }

    // Recompute total with pure domain calculation
    const pricedLines = pricedItems.map((i) => ({
      unitPricePaise: i.unitPricePaise,
      qty: i.qty,
    }));

    const deliveryFee =
      fulfilment === "pickup"
        ? 0
        : pricedLines.reduce((s, i) => s + i.qty * i.unitPricePaise, 0) >= store.minFreeDeliveryPaise
        ? 0
        : store.deliveryFeePaise;

    const cartTotals = calculateCartTotal({
      lines: pricedLines,
      fulfilment: fulfilment as Fulfilment,
      deliveryFeePaise: deliveryFee,
      tipPaise: fulfilment === "delivery" ? tipPaise : 0,
    });

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const collectionCode = fulfilment === "pickup" ? generateCollectionCode() : null;

    let razorpayOrderId: string | null = null;
    const isOnlinePayment = paymentMethod === "upi" || paymentMethod === "card";

    // Create Razorpay Order if online payment
    if (isOnlinePayment) {
      if (isRazorpayConfigured()) {
        try {
          const razorpay = getRazorpayClient();
          const rzpOrder = await razorpay.orders.create({
            amount: cartTotals.totalPaise,
            currency: "INR",
            receipt: orderNumber,
            notes: {
              fulfilment,
              phone: phone ?? "",
            },
          });
          razorpayOrderId = rzpOrder.id;
        } catch (rzpErr: unknown) {
          console.error("Razorpay order creation failed:", rzpErr);
          return NextResponse.json(
            { error: "Payment gateway unavailable. Please choose Pay on Delivery." },
            { status: 502 },
          );
        }
      } else {
        // Local / demo simulation Razorpay Order ID
        razorpayOrderId = `order_sim_${Date.now()}`;
      }
    }

    // Initial Status
    const initialStatus = paymentMethod === "cod" ? "received" : "pending_payment";

    let dbOrderId = `ord-${Date.now().toString().slice(-6)}`;

    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const { data: newOrder, error: orderInsertErr } = await supabase
          .from("orders")
          .insert({
            order_number: orderNumber,
            store_id: process.env.NEXT_PUBLIC_STORE_ID || "00000000-0000-0000-0000-000000000001",
            status: initialStatus,
            fulfilment,
            delivery_address: deliveryAddress ? JSON.stringify(deliveryAddress) : null,
            subtotal_paise: cartTotals.subtotalPaise,
            delivery_fee_paise: cartTotals.deliveryFeePaise,
            tip_paise: cartTotals.tipPaise,
            total_paise: cartTotals.totalPaise,
            payment_method: paymentMethod,
            collection_code: collectionCode,
            razorpay_order_id: razorpayOrderId,
          })
          .select("id")
          .single();

        if (orderInsertErr) {
          console.error("Error inserting order to DB:", orderInsertErr);
        } else if (newOrder) {
          dbOrderId = newOrder.id;

          // Insert order items
          const itemsToInsert = pricedItems.map((item) => ({
            order_id: dbOrderId,
            product_id: item.productId.startsWith("p0000") ? item.productId : null,
            name_snapshot: item.name,
            unit_price_paise: item.unitPricePaise,
            qty: item.qty,
          }));

          await supabase.from("order_items").insert(itemsToInsert);
        }
      } catch (err) {
        console.error("Supabase order error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: dbOrderId,
      orderNumber,
      status: initialStatus,
      fulfilment,
      paymentMethod,
      totalPaise: cartTotals.totalPaise,
      subtotalPaise: cartTotals.subtotalPaise,
      deliveryFeePaise: cartTotals.deliveryFeePaise,
      tipPaise: cartTotals.tipPaise,
      collectionCode,
      razorpayOrderId,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_campusmarket",
      items: pricedItems,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (isSupabaseConfigured()) {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && orders) {
        return NextResponse.json({ orders });
      }
    }

    return NextResponse.json({
      orders: [],
      message: "Connect Supabase for persistent server-side order logs.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
