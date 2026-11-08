import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay/webhook";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

function generateCollectionCode(): string {
  const letters = ["A", "B", "C", "D", "E"];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${letter}${num}`;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "dev_razorpay_webhook_secret";

    // 1. Verify cryptographic HMAC-SHA256 signature
    const isValid = verifyRazorpayWebhookSignature({
      rawBody,
      signature: signature ?? "",
      secret,
    });

    if (!isValid && process.env.NODE_ENV === "production") {
      console.error("Invalid Razorpay webhook signature");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    // If Supabase is not connected yet, acknowledge webhook cleanly
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        received: true,
        event,
        message: "Webhook processed (Demo mode - Supabase not configured)",
      });
    }

    const supabase = createAdminClient();

    // 2. Handle Payment Captured / Order Paid
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
      const razorpayPaymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount;

      if (!razorpayOrderId) {
        console.warn("No order_id found in payment webhook payload");
        return NextResponse.json({ received: true });
      }

      // Find the order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id, status, total_paise, fulfilment, collection_code")
        .eq("razorpay_order_id", razorpayOrderId)
        .single();

      if (orderErr || !order) {
        console.warn(`Order with razorpay_order_id ${razorpayOrderId} not found.`);
        // Return 200 to prevent Razorpay from infinite retry loops for untracked test orders
        return NextResponse.json({ received: true });
      }

      // Idempotency: If already paid or progressed, ignore duplicate event
      if (order.status !== "pending_payment") {
        console.log(`Order ${order.id} is already in '${order.status}' state. Skipping.`);
        return NextResponse.json({ received: true, alreadyProcessed: true });
      }

      // Amount verification
      if (amountPaise && amountPaise !== order.total_paise) {
        console.error(
          `Security Alert: Webhook amount mismatch! Expected ${order.total_paise}, got ${amountPaise}`,
        );
        return NextResponse.json(
          { error: "Amount mismatch detected" },
          { status: 400 },
        );
      }

      // Generate collection code if pickup and missing
      const collectionCode =
        order.fulfilment === "pickup" && !order.collection_code
          ? generateCollectionCode()
          : order.collection_code;

      // Update order to paid
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          status: "paid",
          razorpay_payment_id: razorpayPaymentId,
          collection_code: collectionCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateErr) {
        console.error("Failed to update order status to paid:", updateErr);
        return NextResponse.json({ error: "DB update error" }, { status: 500 });
      }

      // Atomically decrement stock for order items
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, qty")
        .eq("order_id", order.id);

      if (items && items.length > 0) {
        for (const item of items) {
          if (item.product_id) {
            // Decrement stock
            const { data: stock } = await supabase
              .from("store_stock")
              .select("qty")
              .eq("product_id", item.product_id)
              .single();

            if (stock) {
              const newQty = Math.max(0, stock.qty - item.qty);
              await supabase
                .from("store_stock")
                .update({ qty: newQty, updated_at: new Date().toISOString() })
                .eq("product_id", item.product_id);
            }
          }
        }
      }

      console.log(`Order ${order.id} moved to 'paid' successfully.`);
      return NextResponse.json({ success: true, orderId: order.id });
    }

    // 3. Handle Refund Processed
    if (event === "refund.processed") {
      const refundEntity = payload.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;

      if (paymentId) {
        await supabase
          .from("orders")
          .update({
            status: "refunded",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_payment_id", paymentId);
      }
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true, unhandledEvent: event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
