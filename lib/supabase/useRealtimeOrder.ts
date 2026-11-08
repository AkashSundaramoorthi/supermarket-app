"use client";

import { useEffect, useState } from "react";
import { createClient } from "./client";
import { isSupabaseConfigured } from "./admin";
import type { OrderStatus } from "@/features/orders/stateMachine";

export function useRealtimeOrder(
  orderId: string,
  initialStatus: OrderStatus,
  initialCollectionCode: string | null = null,
) {
  const [realtimeUpdate, setRealtimeUpdate] = useState<{
    status?: OrderStatus;
    collectionCode?: string | null;
  }>({});

  useEffect(() => {
    if (!orderId || !isSupabaseConfigured()) {
      return;
    }

    const supabase = createClient();

    // Subscribe to Postgres Changes on public.orders for this order ID
    const channel = supabase
      .channel(`realtime-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          if (newRow) {
            setRealtimeUpdate({
              status: (newRow.status as OrderStatus) || undefined,
              collectionCode: (newRow.collection_code as string | null) ?? undefined,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const status = realtimeUpdate.status ?? initialStatus;
  const collectionCode =
    realtimeUpdate.collectionCode !== undefined
      ? realtimeUpdate.collectionCode
      : initialCollectionCode;

  return { status, collectionCode };
}
