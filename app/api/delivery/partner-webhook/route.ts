import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canTransition, ORDER_STATUSES, type OrderStatus } from "@/features/orders/stateMachine";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

// Delivery partner webhook payload schema
const partnerWebhookSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  status: z.enum(ORDER_STATUSES),
  deliveryPartner: z.string().optional().default("Express Courier"),
  trackingUrl: z.string().url().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  driverLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = partnerWebhookSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid delivery partner payload", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const {
      orderId,
      status: targetStatus,
      deliveryPartner,
      trackingUrl,
      driverName,
      driverPhone,
      driverLocation,
    } = result.data;

    // Delivery partners can only push operational delivery states
    const validDeliveryStatuses: OrderStatus[] = [
      "packed",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!validDeliveryStatuses.includes(targetStatus)) {
      return NextResponse.json(
        {
          error: `Delivery partners can only update statuses: ${validDeliveryStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    if (isSupabaseConfigured()) {
      // 1. Fetch current order
      const { data: order, error: fetchErr } = await supabase
        .from("orders")
        .select("id, status, fulfilment, delivery_address")
        .or(`id.eq.${orderId},order_number.eq.${orderId}`)
        .single();

      if (fetchErr || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const currentStatus = order.status as OrderStatus;
      const orderFulfilment = order.fulfilment as "pickup" | "delivery";

      // Strict enforcement: Once an order is out for delivery, it cannot be cancelled
      if (currentStatus === "out_for_delivery" && targetStatus === "cancelled") {
        return NextResponse.json(
          {
            error: "Cancellation rejected: Order is already out for delivery with courier.",
            code: "CANNOT_CANCEL_OUT_FOR_DELIVERY",
          },
          { status: 400 },
        );
      }

      // Check state machine transition
      const allowed = canTransition(currentStatus, targetStatus, {
        fulfilment: orderFulfilment,
        wasPaid: true,
      });

      if (!allowed) {
        return NextResponse.json(
          {
            error: `Illegal status transition: Cannot transition from "${currentStatus}" to "${targetStatus}".`,
            code: "ILLEGAL_STATE_TRANSITION",
          },
          { status: 400 },
        );
      }

      // Update metadata inside jsonb delivery_address
      const existingAddress =
        typeof order.delivery_address === "object" && order.delivery_address !== null
          ? order.delivery_address
          : {};

      const updatedDeliveryMetadata = {
        ...existingAddress,
        deliveryPartner,
        trackingUrl: trackingUrl || (existingAddress as Record<string, unknown>).trackingUrl,
        driverName: driverName || (existingAddress as Record<string, unknown>).driverName,
        driverPhone: driverPhone || (existingAddress as Record<string, unknown>).driverPhone,
        driverLocation:
          driverLocation || (existingAddress as Record<string, unknown>).driverLocation,
        lastPartnerUpdate: new Date().toISOString(),
      };

      // Perform atomic update
      const { data: updated, error: updateErr } = await supabase
        .from("orders")
        .update({
          status: targetStatus,
          delivery_address: JSON.parse(JSON.stringify(updatedDeliveryMetadata)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        orderId: updated.id,
        status: updated.status,
        deliveryPartner,
        trackingUrl,
        message: `Order status successfully synced to "${targetStatus}"`,
      });
    }

    // Mock fallback when Supabase is running in local placeholder mode
    return NextResponse.json({
      success: true,
      orderId,
      status: targetStatus,
      deliveryPartner,
      trackingUrl,
      simulated: true,
    });
  } catch (err: unknown) {
    console.error("Delivery partner webhook failed:", err);
    return NextResponse.json(
      { error: "Internal delivery webhook error" },
      { status: 500 },
    );
  }
}
