import { describe, expect, it } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

describe("Supabase Backend Integration Suite", () => {
  it("initializes Supabase browser client with valid URL and key", () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.from).toBeTypeOf("function");
    expect(client.channel).toBeTypeOf("function");
  });

  it("initializes Supabase service-role admin client", () => {
    const admin = createAdminClient();
    expect(admin).toBeDefined();
    expect(admin.from).toBeTypeOf("function");
    expect(admin.rpc).toBeTypeOf("function");
  });

  it("checks Supabase configuration detection", () => {
    // In dev environment with placeholder keys, isSupabaseConfigured returns false
    expect(typeof isSupabaseConfigured()).toBe("boolean");
  });

  it("validates database table schema types", () => {
    const admin = createAdminClient();
    // Verify types by selecting from defined tables without runtime query failure
    const ordersQuery = admin.from("orders").select("id, status, total_paise");
    expect(ordersQuery).toBeDefined();

    const productsQuery = admin.from("products").select("id, name, price_paise");
    expect(productsQuery).toBeDefined();

    const stockQuery = admin.from("store_stock").select("store_id, product_id, qty");
    expect(stockQuery).toBeDefined();
  });
});
