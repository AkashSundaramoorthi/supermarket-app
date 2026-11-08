import type { PlaceholderOrder } from "@/lib/placeholder/orders";
import { STATUS_LABELS } from "@/features/orders/statusLabels";

/**
 * Escapes a cell value for standard RFC 4180 CSV
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates RFC 4180 compliant CSV string from an array of orders
 */
export function generateOrdersCsv(orders: PlaceholderOrder[]): string {
  const headers = [
    "Order ID",
    "Date (ISO)",
    "Formatted Date & Time",
    "Fulfilment Type",
    "Order Status",
    "Payment Method",
    "Total Amount (INR)",
    "Total Amount (Paise)",
    "Items Count",
    "Items Detail",
    "Delivery Address",
    "Store Pickup Code",
  ];

  const rows = orders.map((order) => {
    const formattedDate = new Date(order.createdAt).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const itemsSummary = (order.items || [])
      .map((item) => `${item.name} (x${item.qty}) @ Rs.${(item.unitPricePaise / 100).toFixed(2)}`)
      .join("; ");

    return [
      escapeCsvCell(order.id),
      escapeCsvCell(order.createdAt),
      escapeCsvCell(formattedDate),
      escapeCsvCell(order.fulfilment === "pickup" ? "Store Owner Pickup" : "Store Delivery"),
      escapeCsvCell(STATUS_LABELS[order.status] || order.status),
      escapeCsvCell(order.paymentMethod.toUpperCase()),
      escapeCsvCell((order.totalPaise / 100).toFixed(2)),
      escapeCsvCell(order.totalPaise),
      escapeCsvCell(order.itemCount),
      escapeCsvCell(itemsSummary || "Groceries Basket"),
      escapeCsvCell(order.address || "N/A (Pickup)"),
      escapeCsvCell(order.collectionCode || "N/A (Delivery)"),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Triggers browser file download
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export orders as CSV file download
 */
export function exportOrdersToCsv(orders: PlaceholderOrder[], filenamePrefix = "quickmart-orders") {
  const csv = generateOrdersCsv(orders);
  const dateStr = new Date().toISOString().split("T")[0];
  downloadFile(csv, `${filenamePrefix}-${dateStr}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export orders as JSON file download
 */
export function exportOrdersToJson(orders: PlaceholderOrder[], filenamePrefix = "quickmart-orders-analysis") {
  const json = JSON.stringify(orders, null, 2);
  const dateStr = new Date().toISOString().split("T")[0];
  downloadFile(json, `${filenamePrefix}-${dateStr}.json`, "application/json");
}
