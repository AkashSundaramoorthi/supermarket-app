import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateCartTotal, type Fulfilment } from "@/lib/pricing/calculateCartTotal";
import { products, store } from "@/lib/placeholder/catalog";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

const orderInputSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      qty: z.number().int().min(1).max(20),
    }),
  ).min(1, "Order must contain at least one item"),
  fulfilment: z.enum(["pickup", "delivery"]),
  storeId: z.string().optional(),
  paymentMethod: z.enum(["cod", "upi"]),
  utr: z.string().optional(),
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

    const { items: requestedItems, fulfilment, paymentMethod, utr, deliveryAddress, tipPaise, phone } =
      result.data;

    if (fulfilment === "delivery" && !deliveryAddress) {
      return NextResponse.json(
        { error: "Delivery address is required for delivery orders" },
        { status: 422 },
      );
    }

    const supabase = createAdminClient();

    // Verify delivery status if placing a delivery order
    if (fulfilment === "delivery" && isSupabaseConfigured()) {
      try {
        const storeId = process.env.NEXT_PUBLIC_STORE_ID || "a0000000-0000-0000-0000-000000000001";
        const { data: storeRow } = await supabase
          .from("stores")
          .select("delivery_enabled")
          .eq("id", storeId)
          .maybeSingle();

        if (storeRow && storeRow.delivery_enabled === false) {
          return NextResponse.json(
            { error: "Store delivery is currently paused by the owner (no delivery partners available). Please place a pickup order." },
            { status: 400 },
          );
        }
      } catch {
        // Continue if check fails
      }
    }

    // SERVER-SIDE REPRICING (Decision D4)
    // Server independently loads current prices and availability from DB / catalog.
    // Client-submitted prices are completely ignored.
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

    // Direct UPI parameters
    const storeUpi = process.env.NEXT_PUBLIC_STORE_UPI_ID || store.upiId || "freshmart@okaxis";
    const amountRupees = (cartTotals.totalPaise / 100).toFixed(2);
    const upiUri = `upi://pay?pa=${storeUpi}&pn=${encodeURIComponent(store.name)}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(orderNumber)}`;

    // Initial Status:
    // If UPI with UTR: "paid"
    // If COD: "received"
    // If UPI pending UTR: "pending_payment"
    const initialStatus =
      paymentMethod === "upi" && utr
        ? "paid"
        : paymentMethod === "cod"
        ? "received"
        : "pending_payment";

    let dbOrderId = `ord-${Date.now().toString().slice(-6)}`;

    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const addressPayload = deliveryAddress
          ? { ...deliveryAddress, phone: phone || null, utr: utr || null }
          : utr
          ? { phone: phone || null, utr }
          : phone
          ? { phone }
          : null;

        const { data: newOrder, error: orderInsertErr } = await supabase
          .from("orders")
          .insert({
            order_number: orderNumber,
            store_id: process.env.NEXT_PUBLIC_STORE_ID || "00000000-0000-0000-0000-000000000001",
            status: initialStatus,
            fulfilment,
            delivery_address: addressPayload ? JSON.stringify(addressPayload) : null,
            subtotal_paise: cartTotals.subtotalPaise,
            delivery_fee_paise: cartTotals.deliveryFeePaise,
            tip_paise: cartTotals.tipPaise,
            total_paise: cartTotals.totalPaise,
            payment_method: paymentMethod,
            collection_code: collectionCode,
            razorpay_payment_id: utr ? `utr_${utr}` : null,
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
      upiUri,
      storeUpi,
      utr: utr || null,
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
