# Decisions

## D1. Next.js App Router with TypeScript
One codebase for pages, route handlers, and middleware, with first-class Vercel deploys. Server components keep catalog pages fast on student phones. TypeScript lets domain code (pricing, state machine) be shared and tested.

## D2. Supabase as the only backend
Postgres, Auth (phone OTP), RLS, Realtime, and Edge Functions cover everything in one managed service. RLS puts access rules next to the data. No custom server beyond Next.js route handlers and Edge Functions.

## D3. Webhook-only payment confirmation
The browser success callback can be faked or lost (tab closed, flaky network). Only the signed Razorpay webhook marks an order `paid`; the status page waits via Realtime. Costs a few seconds of delay, buys correctness.

## D4. Server-side repricing
The client sends product ids and quantities only. `create-order` recomputes prices, stock, and the student discount from the DB. Cart prices in the UI are previews.

## D5. Zustand with localStorage for cart
Small, no provider boilerplate, persists across reloads for guests. Merged into the server cart at login. Alternative (server cart only) would force login before adding items.

## D6. `/kiosk` route instead of a native kiosk app
Reuses the catalog and components, deploys with the web app, and runs on any tablet or PC in browser kiosk mode. Tradeoff: cannot lock the device like Android lock-task mode, so OS-level lockdown is part of store setup.

## D7. Money as integer paise
Avoids float rounding in discounts and matches Razorpay's amounts.

## Assumptions (ambiguities resolved)
- A1. Single store at launch; schema supports many. Stock is per store.
- A2. Student discount is 10% of subtotal, applied to the whole order, rounded to the nearest paisa.
- A3. Student verification is by ID photo upload and manual review only. No college email, no email service. The app is open to everyone; the discount is just a perk.
- A4. No admin panel: staff move orders through states via Supabase dashboard or SQL.
- A5. Delivery has a flat per-store fee (`stores.delivery_fee_paise`), not discounted by the student discount; no zone logic in MVP. Pickup is free. Address is free text.
- A6. Kiosk orders are created by a route handler under a kiosk user and paid via Razorpay UPI QR.
- A7. Abandoned `pending_payment` orders auto-cancel after 30 minutes.
- A8. Razorpay webhook events used: `payment.captured`, `payment.failed`, `refund.processed`.
