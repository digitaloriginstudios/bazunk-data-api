import Stripe from "stripe";
import { db } from "./db.js";
import { getCreditPackage, type CreditPackageId } from "./commercial-pricing.js";
import { grantApiCredits } from "./credit-wallet.js";

/** Checkout is disabled unless explicit test-mode Stripe configuration is supplied. */
function stripeClient() {
  const key = process.env.DATA_PLATFORM_STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_test_")) throw new Error("Data Platform Stripe test key not configured");
  return new Stripe(key);
}
export function stripeCheckoutEnabled() {
  return Boolean(process.env.DATA_PLATFORM_STRIPE_SECRET_KEY?.startsWith("sk_test_") && process.env.DATA_PLATFORM_STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"));
}
export async function migrateStripeBilling() {
  if (!db) throw new Error("Database unavailable");
  await db.query(`
    CREATE TABLE IF NOT EXISTS api_credit_checkouts (
      session_id text PRIMARY KEY,
      client_id uuid NOT NULL REFERENCES api_clients(id),
      package_id text NOT NULL,
      credits bigint NOT NULL CHECK (credits > 0),
      amount_cents integer NOT NULL CHECK (amount_cents > 0),
      currency text NOT NULL DEFAULT 'usd',
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','refunded')),
      created_at timestamptz NOT NULL DEFAULT now(),
      paid_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS api_credit_stripe_events (
      event_id text PRIMARY KEY,
      event_type text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}
export async function createCreditCheckout(clientId:string, packageId:CreditPackageId, successUrl:string, cancelUrl:string) {
  if (!db) throw new Error("Database unavailable");
  if (!stripeCheckoutEnabled()) throw new Error("Stripe test checkout is disabled");
  const pkg=getCreditPackage(packageId);
  const stripe=stripeClient();
  // Only redirect back to the configured Data Platform origin.
  const origin=process.env.DATA_PLATFORM_CHECKOUT_ORIGIN ?? "https://data.bazunk.com";
  for(const u of [successUrl,cancelUrl]) if(new URL(u).origin!==origin) throw new Error("Invalid return URL origin");
  const session=await stripe.checkout.sessions.create({
    mode:"payment",payment_method_types:["card"],client_reference_id:clientId,
    line_items:[{price_data:{currency:"usd",unit_amount:pkg.priceUsdCents,
      product_data:{name:`Bazunk Data Platform — ${pkg.credits} API credits`}},quantity:1}],
    success_url:successUrl,cancel_url:cancelUrl,
    metadata:{service:"bazunk-data-platform",clientId,packageId},
  });
  if(!session.url) throw new Error("Stripe did not return a checkout URL");
  await db.query("INSERT INTO api_credit_checkouts(session_id,client_id,package_id,credits,amount_cents) VALUES($1,$2,$3,$4,$5)",
    [session.id,clientId,packageId,pkg.credits,pkg.priceUsdCents]);
  return {url:session.url,sessionId:session.id};
}
export async function processStripeWebhook(payload:Buffer, signature:string) {
  if(!db) throw new Error("Database unavailable");
  const secret=process.env.DATA_PLATFORM_STRIPE_WEBHOOK_SECRET;
  if(!secret || !stripeCheckoutEnabled()) throw new Error("Stripe webhook disabled");
  const stripe=stripeClient();
  const event=stripe.webhooks.constructEvent(payload,signature,secret);
  if(event.type!=="checkout.session.completed" && event.type!=="checkout.session.async_payment_succeeded") return {handled:false};
  const session=event.data.object as Stripe.Checkout.Session;
  if(session.payment_status!=="paid" || session.mode!=="payment") return {handled:false};
  const saved=await db.query<{client_id:string;credits:string;amount_cents:number;status:string;currency:string}>(
    "SELECT client_id,credits::text,amount_cents,status,currency FROM api_credit_checkouts WHERE session_id=$1",[session.id]);
  const row=saved.rows[0];
  if(!row) throw new Error("Unknown checkout session");
  if(row.client_id!==session.client_reference_id || session.amount_total!==row.amount_cents ||
     session.currency?.toLowerCase()!==row.currency || session.metadata?.service!=="bazunk-data-platform" ||
     session.metadata?.clientId!==row.client_id) throw new Error("Checkout verification mismatch");
  // The wallet operation key makes duplicate deliveries and concurrent webhook retries idempotent.
  const result=await grantApiCredits(row.client_id,Number(row.credits),`stripe:checkout:${session.id}`,"stripe_payment");
  await db.query("UPDATE api_credit_checkouts SET status='paid',paid_at=COALESCE(paid_at,now()) WHERE session_id=$1",[session.id]);
  await db.query("INSERT INTO api_credit_stripe_events(event_id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING",[event.id,event.type]);
  return {handled:true,applied:result.applied};
}
