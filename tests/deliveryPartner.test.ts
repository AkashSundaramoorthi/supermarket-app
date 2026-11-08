import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/delivery/partner-webhook/route";
import { NextRequest } from "next/server";

describe("Delivery Partner Webhook Integration", () => {
  it("rejects payloads missing orderId or status", async () => {
    const req = new NextRequest("http://localhost:3000/api/delivery/partner-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "out_for_delivery",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid delivery partner payload");
  });

  it("rejects non-operational statuses from delivery partner", async () => {
    const req = new NextRequest("http://localhost:3000/api/delivery/partner-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "ord-test-123",
        status: "pending_payment",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Delivery partners can only update statuses");
  });

  it("accepts valid delivery partner sync payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/delivery/partner-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "ord-test-123",
        status: "out_for_delivery",
        deliveryPartner: "Shadowfax Express",
        trackingUrl: "https://track.shadowfax.in/SFX12345",
        driverName: "Suresh P",
        driverPhone: "+91 91234 56789",
        driverLocation: { lat: 12.9745, lng: 77.5985 },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.deliveryPartner).toBe("Shadowfax Express");
  });
});
