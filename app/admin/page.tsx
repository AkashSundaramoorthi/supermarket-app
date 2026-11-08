import type { Metadata } from "next";
import { AdminAnalyticsScreen } from "@/features/admin/AdminAnalyticsScreen";
import { AdminSecurityGate } from "@/features/admin/AdminSecurityGate";

export const metadata: Metadata = {
  title: "Store Owner Console & Live Dispatch Control | QuickMart",
  description:
    "Real-time revenue, live order dispatching, driver delivery controls, inventory alerts, and demand planning for store owners.",
};

export default function AdminPage() {
  return (
    <AdminSecurityGate>
      <AdminAnalyticsScreen />
    </AdminSecurityGate>
  );
}
