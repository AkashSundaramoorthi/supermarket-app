const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function formatPaise(paise: number): string {
  return formatter.format(paise / 100);
}
