import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { computeAdminAnalytics } from "@/lib/analytics/adminMetrics";
import { placeholderOrders, type PlaceholderOrder } from "@/lib/placeholder/orders";

export async function GET() {
  try {
    let ordersList: PlaceholderOrder[] = placeholderOrders;

    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();
      const { data: dbOrders } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (dbOrders && dbOrders.length > 0) {
        ordersList = dbOrders.map((o) => {
          const rawItems = (o as unknown as { order_items?: Array<{ name_snapshot: string; qty: number; unit_price_paise: number }> }).order_items;
          return {
            id: o.id,
            createdAt: o.created_at,
            fulfilment: o.fulfilment,
            status: o.status,
            paymentMethod: o.payment_method,
            totalPaise: o.total_paise,
            itemCount: rawItems?.length || 1,
            collectionCode: o.collection_code,
            items: rawItems?.map((item) => ({
              name: item.name_snapshot,
              qty: item.qty,
              unitPricePaise: item.unit_price_paise,
            })),
          };
        });
      }
    }

    const metrics = computeAdminAnalytics(ordersList);
    return NextResponse.json({ success: true, metrics });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
