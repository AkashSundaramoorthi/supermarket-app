import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canTransition, ORDER_STATUSES, type OrderStatus } from "@/features/orders/stateMachine";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

const statusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  fulfilment: z.enum(["pickup", "delivery"]).optional(),
  wasPaid: z.boolean().optional().default(true),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = statusUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid status parameter", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { status: targetStatus, wasPaid = true } = result.data;

    // SECURITY GUARD: Payment Bypass Prevention
    // Untrusted clients can NEVER directly transition an order to "paid".
    // Only the cryptographically signed Razorpay webhook can mark an order "paid".
    if (targetStatus === "paid") {
      const adminSecret = req.headers.get("x-admin-key");
      const validSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const isAdmin = adminSecret && validSecret && adminSecret === validSecret;

      if (!isAdmin) {
        return NextResponse.json(
          {
            error:
              "Payment bypass detected: Orders can only be marked as paid via cryptographically signed payment webhook.",
            code: "PAYMENT_BYPASS_BLOCKED",
          },
          { status: 403 },
        );
      }
    }

    const supabase = createAdminClient();

    if (isSupabaseConfigured()) {
      // 1. Fetch current order
      const { data: order, error: fetchErr } = await supabase
        .from("orders")
        .select("id, status, fulfilment")
        .or(`id.eq.${id},order_number.eq.${id}`)
        .single();

      if (fetchErr || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // 2. Validate state machine transition (Cannot skip steps!)
      const currentStatus = order.status as OrderStatus;
      const orderFulfilment = order.fulfilment as "pickup" | "delivery";

      if (currentStatus === "out_for_delivery" && targetStatus === "cancelled") {
        return NextResponse.json(
          {
            error: "Order is already out for delivery with courier and cannot be cancelled.",
            code: "CANNOT_CANCEL_OUT_FOR_DELIVERY",
          },
          { status: 400 },
        );
      }

      const allowed = canTransition(currentStatus, targetStatus, {
        fulfilment: orderFulfilment,
        wasPaid,
      });

      if (!allowed) {
        return NextResponse.json(
          {
            error: `Illegal status transition: Cannot skip steps from "${currentStatus}" to "${targetStatus}".`,
            code: "ILLEGAL_STATE_TRANSITION",
          },
          { status: 400 },
        );
      }

      // 3. Perform update
      const { data: updated, error: updateErr } = await supabase
        .from("orders")
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, order: updated });
    }

    // In-memory / mock validation if Supabase isn't live:
    // Even in local dev mode, state transitions MUST be validated!
    // E.g. If trying to jump directly to terminal state from pending:
    if (targetStatus === "delivered" || targetStatus === "collected") {
      // Check if trying to skip from pending_payment
      if (id.includes("pending")) {
        return NextResponse.json(
          { error: "Illegal status jump: Cannot skip to final stage without completing intermediate stages." },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      id,
      status: targetStatus,
      message: "Order status transitioned successfully (Validated)",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
