import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured()) {
      // 1. Check if caller is admin / staff
      const adminSecret = req.headers.get("x-admin-key");
      const validSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const isAdmin = adminSecret && validSecret && adminSecret === validSecret;

      if (isAdmin) {
        const adminClient = createAdminClient();
        const { data: order, error } = await adminClient
          .from("orders")
          .select("*, order_items(*)")
          .or(`id.eq.${id},order_number.eq.${id}`)
          .single();

        if (!error && order) {
          return NextResponse.json({ order });
        }
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // 2. IDOR Protection: Query with User Session RLS
      const userClient = await createServerSupabaseClient();
      const { data: order, error } = await userClient
        .from("orders")
        .select("*, order_items(*)")
        .or(`id.eq.${id},order_number.eq.${id}`)
        .single();

      if (error || !order) {
        // If order exists but belongs to another user, RLS returns 0 rows / error
        return NextResponse.json(
          { error: "Order not found or access unauthorized" },
          { status: 404 },
        );
      }

      return NextResponse.json({ order });
    }

    return NextResponse.json(
      { error: "Order not found in database" },
      { status: 404 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
