import Razorpay from "razorpay";

export function isRazorpayConfigured(): boolean {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes("campusmarket") &&
    keySecret !== "dev_razorpay_secret"
  );
}

export function getRazorpayClient() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_campusmarket";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "dev_razorpay_secret";

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}
