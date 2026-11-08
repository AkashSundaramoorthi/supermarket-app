// Supabase Edge Function: create-order
// Runtime: Deno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CartItemInput {
  productId: string;
  qty: number;
}

interface CreateOrderPayload {
  items: CartItemInput[];
  fulfilment: "pickup" | "delivery";
  storeId?: string;
  paymentMethod: "cod" | "upi" | "card";
  deliveryAddress?: {
    line: string;
    pincode: string;
  };
  tipPaise?: number;
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Extract Auth user from JWT
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userPhone = "";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        userPhone = user.phone ?? "";
      }
    }

    const payload: CreateOrderPayload = await req.json();
    const { items, fulfilment, paymentMethod, deliveryAddress, tipPaise = 0 } = payload;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (fulfilment === "delivery" && (!deliveryAddress || !deliveryAddress.pincode)) {
      return new Response(JSON.stringify({ error: "Delivery address with pincode is required" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. SERVER-SIDE REPRICING (Decision D4)
    // Fetch active products and prices directly from Supabase
    const productIds = items.map((i) => i.productId);
    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price_paise, active")
      .in("id", productIds)
      .eq("active", true);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to load catalog products" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify all requested items exist and are priced
    const pricedItems = [];
    for (const item of items) {
      const p = dbProducts.find((prod) => prod.id === item.productId);
      if (!p) {
        return new Response(
          JSON.stringify({ error: `Product ${item.productId} is unavailable or out of stock` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      pricedItems.push({
        productId: p.id,
        name: p.name,
        unitPricePaise: p.price_paise,
        qty: Math.min(Math.max(1, item.qty), 20),
      });
    }

    // 4. Calculate Subtotal, Delivery Fee & Tip
    const subtotalPaise = pricedItems.reduce((sum, i) => sum + i.unitPricePaise * i.qty, 0);
    const deliveryFeePaise = fulfilment === "pickup" ? 0 : subtotalPaise >= 19900 ? 0 : 2500;
    const finalTipPaise = fulfilment === "delivery" ? Math.max(0, tipPaise) : 0;
    const totalPaise = subtotalPaise + deliveryFeePaise + finalTipPaise;

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    // 5. Create Razorpay Order if online payment
    let razorpayOrderId: string | null = null;
    const isOnline = paymentMethod === "upi" || paymentMethod === "card";

    if (isOnline && razorpayKeyId && razorpayKeySecret) {
      const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalPaise,
          currency: "INR",
          receipt: orderNumber,
          notes: {
            fulfilment,
            userId: userId ?? "guest",
            phone: userPhone,
          },
        }),
      });

      if (!rzpRes.ok) {
        const errText = await rzpRes.text();
        console.error("Razorpay order creation failed:", errText);
        return new Response(
          JSON.stringify({ error: "Payment gateway error. Please try Cash on Delivery." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const rzpData = await rzpRes.json();
      razorpayOrderId = rzpData.id;
    } else if (isOnline) {
      razorpayOrderId = `order_sim_${Date.now()}`;
    }

    // 6. Generate Collection Code for Pickup
    const letters = ["A", "B", "C", "D", "E"];
    const collectionCode =
      fulfilment === "pickup"
        ? `${letters[Math.floor(Math.random() * letters.length)]}${Math.floor(100 + Math.random() * 900)}`
        : null;

    // 7. Insert Order into Supabase Database
    const initialStatus = paymentMethod === "cod" ? "received" : "pending_payment";
    const storeId = payload.storeId || "00000000-0000-0000-0000-000000000001";

    const { data: newOrder, error: insertErr } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: userId,
        store_id: storeId,
        status: initialStatus,
        fulfilment,
        delivery_address: deliveryAddress ? JSON.stringify(deliveryAddress) : null,
        subtotal_paise: subtotalPaise,
        delivery_fee_paise: deliveryFeePaise,
        tip_paise: finalTipPaise,
        total_paise: totalPaise,
        payment_method: paymentMethod,
        collection_code: collectionCode,
        razorpay_order_id: razorpayOrderId,
      })
      .select("id")
      .single();

    if (insertErr || !newOrder) {
      console.error("Order insertion failed:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to persist order in database" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Insert Order Items Snapshots
    const orderItems = pricedItems.map((item) => ({
      order_id: newOrder.id,
      product_id: item.productId,
      name_snapshot: item.name,
      unit_price_paise: item.unitPricePaise,
      qty: item.qty,
    }));

    await supabase.from("order_items").insert(orderItems);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: newOrder.id,
        orderNumber,
        status: initialStatus,
        fulfilment,
        paymentMethod,
        totalPaise,
        subtotalPaise,
        deliveryFeePaise,
        tipPaise: finalTipPaise,
        collectionCode,
        razorpayOrderId,
        razorpayKeyId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Unhandled Edge Function error:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
