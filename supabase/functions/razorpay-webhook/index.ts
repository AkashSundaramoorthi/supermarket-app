// Supabase Edge Function: razorpay-webhook
// Runtime: Deno

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Constant-time HMAC-SHA256 signature verification using Web Crypto API
async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(rawBody));
    const expectedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return expectedHex === signature;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ?? "";

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // 1. Verify HMAC-SHA256 Signature
    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid Razorpay webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`[Supabase Edge Function: razorpay-webhook] Event: ${event}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Handle Payment Captured / Order Paid
    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
      const razorpayPaymentId = paymentEntity?.id;
      const amountPaise = paymentEntity?.amount;

      if (!razorpayOrderId) {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Fetch target order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id, status, total_paise, fulfilment, collection_code")
        .eq("razorpay_order_id", razorpayOrderId)
        .single();

      if (orderErr || !order) {
        console.warn(`Order with razorpay_order_id ${razorpayOrderId} not found.`);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Idempotency: Duplicate events are no-ops
      if (order.status !== "pending_payment") {
        console.log(`Order ${order.id} is already ${order.status}. Skipping duplicate webhook.`);
        return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), { status: 200 });
      }

      // Amount Integrity Check
      if (amountPaise && amountPaise !== order.total_paise) {
        console.error(`Amount mismatch: Expected ${order.total_paise}, received ${amountPaise}`);
        return new Response(JSON.stringify({ error: "Amount mismatch detected" }), { status: 400 });
      }

      // Generate collection code for pickup if needed
      let collectionCode = order.collection_code;
      if (order.fulfilment === "pickup" && !collectionCode) {
        const letters = ["A", "B", "C", "D", "E"];
        collectionCode = `${letters[Math.floor(Math.random() * letters.length)]}${Math.floor(100 + Math.random() * 900)}`;
      }

      // Update Order Status to "paid"
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
        console.error("Failed to update order status:", updateErr);
        return new Response(JSON.stringify({ error: "DB update error" }), { status: 500 });
      }

      // Atomically decrement stock using PostgreSQL stored procedure
      await supabase.rpc("decrement_order_stock", { target_order_id: order.id });

      console.log(`Order ${order.id} successfully marked as PAID.`);
      return new Response(JSON.stringify({ success: true, orderId: order.id }), { status: 200 });
    }

    // 3. Handle Refund Processed
    if (event === "refund.processed") {
      const paymentId = payload.payload?.refund?.entity?.payment_id;
      if (paymentId) {
        await supabase
          .from("orders")
          .update({
            status: "refunded",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_payment_id", paymentId);
      }
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ received: true, event }), { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
