import { NextResponse } from "next/server";
import { categories, products, store } from "@/lib/placeholder/catalog";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    if (isSupabaseConfigured()) {
      const [{ data: dbCategories }, { data: dbProducts }, { data: dbStore }] =
        await Promise.all([
          supabase.from("categories").select("*").order("sort_order"),
          supabase.from("products").select("*, store_stock(qty)").eq("active", true),
          supabase.from("stores").select("*").eq("active", true).single(),
        ]);

      if (dbProducts && dbProducts.length > 0) {
        return NextResponse.json({
          store: dbStore ?? store,
          categories: dbCategories ?? categories,
          products: dbProducts,
        });
      }
    }

    // Default / Seed catalog
    return NextResponse.json({
      store,
      categories,
      products,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
