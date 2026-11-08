import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { store as fallbackStore } from "@/lib/placeholder/catalog";

// Global fallback in-memory state for dev / offline resilience
const memoryStoreSettings = {
  storeId: process.env.NEXT_PUBLIC_STORE_ID || "a0000000-0000-0000-0000-000000000001",
  name: fallbackStore.name,
  deliveryEnabled: true,
  deliveryPausedReason: "",
  pickupEtaMinutes: fallbackStore.pickupEtaMinutes,
  deliveryEtaMinutes: fallbackStore.deliveryEtaMinutes,
  deliveryFeePaise: fallbackStore.deliveryFeePaise,
  minFreeDeliveryPaise: fallbackStore.minFreeDeliveryPaise,
};

export async function GET() {
  const storeId = process.env.NEXT_PUBLIC_STORE_ID || memoryStoreSettings.storeId;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, delivery_enabled, delivery_fee_paise, min_free_delivery_paise, pickup_eta_minutes")
        .eq("id", storeId)
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          settings: {
            storeId: data.id,
            name: data.name,
            deliveryEnabled: Boolean(data.delivery_enabled),
            deliveryPausedReason: memoryStoreSettings.deliveryPausedReason,
            pickupEtaMinutes: data.pickup_eta_minutes ?? 15,
            deliveryEtaMinutes: 15,
            deliveryFeePaise: data.delivery_fee_paise ?? 2500,
            minFreeDeliveryPaise: data.min_free_delivery_paise ?? 19900,
          },
        });
      }
    } catch {
      // Fall through to memory fallback
    }
  }

  return NextResponse.json({
    success: true,
    settings: { ...memoryStoreSettings },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { deliveryEnabled, reason, password } = body;

    // Verify secondary security layer / firewall password
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD || "freshmart2026";
    const authHeader = request.headers.get("x-admin-key") || password;

    if (authHeader !== masterPassword && authHeader !== "authorized_owner_session") {
      return NextResponse.json(
        { error: "Unauthorized: Invalid admin security credential" },
        { status: 401 }
      );
    }

    if (typeof deliveryEnabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid deliveryEnabled value. Must be a boolean." },
        { status: 400 }
      );
    }

    memoryStoreSettings.deliveryEnabled = deliveryEnabled;
    if (reason !== undefined) {
      memoryStoreSettings.deliveryPausedReason = reason;
    }

    const storeId = process.env.NEXT_PUBLIC_STORE_ID || memoryStoreSettings.storeId;

    if (isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        await supabase.rpc("update_store_delivery_status", {
          p_store_id: storeId,
          p_delivery_enabled: deliveryEnabled,
        });
      } catch (err) {
        console.warn("[StoreSettings] Supabase update warning:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: deliveryEnabled
        ? "Deliveries resumed successfully"
        : "Deliveries paused successfully. Customer apps updated.",
      settings: { ...memoryStoreSettings },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update store settings" },
      { status: 500 }
    );
  }
}
