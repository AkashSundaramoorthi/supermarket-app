import type { Metadata } from "next";
import { AdminAnalyticsScreen } from "@/features/admin/AdminAnalyticsScreen";

export const metadata: Metadata = {
  title: "Store Owner Analytics & Demand-Supply Dashboard | QuickMart",
  description:
    "Real-time revenue, order feed, inventory supply alerts, and actionable demand-driven promotion planning for store owners.",
};

export default function AdminPage() {
  return <AdminAnalyticsScreen />;
}
