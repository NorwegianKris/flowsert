import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// ──────────────────────────────────────────────
// TIER_MAP — Update with your actual Stripe IDs
// ──────────────────────────────────────────────
const TIER_MAP: Record<string, { tier: string; profile_cap: number; is_unlimited: boolean }> = {
  // Starter
  "price_1T4UM3CTVQHwswgojzCUGSYV": { tier: "starter",      profile_cap: 25,  is_unlimited: false }, // Monthly (10 NOK test)
  "price_1T4TipCTVQHwswgo3i7Wxi0p": { tier: "starter",      profile_cap: 25,  is_unlimited: false }, // Annual
  // Growth
  "price_1T4TjxCTVQHwswgobYyRRe10": { tier: "growth",       profile_cap: 75,  is_unlimited: false }, // Monthly
  "price_1T4TkFCTVQHwswgop7yCPQRM": { tier: "growth",       profile_cap: 75,  is_unlimited: false }, // Annual
  // Professional
  "price_1T4TksCTVQHwswgoItMP8J6n": { tier: "professional", profile_cap: 200, is_unlimited: false }, // Monthly
  "price_1T4Tl8CTVQHwswgoHkYuB2S9": { tier: "professional", profile_cap: 200, is_unlimited: false }, // Annual
};

const DEFAULT_ENTITLEMENT = {
  tier: "starter",
  is_active: false,
  profile_cap: 25,
  is_unlimited: false,
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[stripe-webhook] ${step}${d}`);
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function extractSubscriptionFields(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0] ?? null;
  const priceId = item?.price?.id ?? null;
  // price.product can be a string ID or an expanded Product object
  let productId: string | null = null;
  if (item?.price?.product) {
    const prod = item.price.product;
    productId = typeof prod === "string" ? prod : prod.id;
  }
  return { priceId, productId };
}

async function resolveBusinessId(stripeCustomerId: string): Promise<string | null> {
  // 1. Check billing_customers table
  const { data: existing } = await supabase
    .from("billing_customers")
    .select("business_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (existing?.business_id) return existing.business_id;

  // 2. Fallback: fetch Stripe Customer metadata
  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (customer.deleted) return null;
    const businessId = (customer as Stripe.Customer).metadata?.business_id;
    if (!businessId) return null;

    // Upsert billing_customers for future lookups
    await supabase
      .from("billing_customers")
      .upsert(
        { business_id: businessId, stripe_customer_id: stripeCustomerId },
        { onConflict: "business_id" }
      );

    return businessId;
  } catch (err) {
    log("resolveBusinessId: Stripe API error", { error: String(err) });
    return null;
  }
}

async function syncEntitlements(
  businessId: string,
  status: string,
  priceId: string | null,
  productId: string | null
) {
  const isActive = status === "active" || status === "trialing";

  if (!isActive) {
    // Deterministic downgrade — never leave stale tier data
    log("syncEntitlements: deterministic downgrade", { businessId, status });
    await supabase
      .from("entitlements")
      .upsert(
        { business_id: businessId, ...DEFAULT_ENTITLEMENT },
        { onConflict: "business_id" }
      );
    return;
  }

  // Look up tier by price ID first, then product ID
  const mapped = (priceId && TIER_MAP[priceId]) || (productId && TIER_MAP[productId]) || null;

  if (!mapped) {
    log("syncEntitlements: no TIER_MAP match, keeping active with defaults", {
      businessId, priceId, productId,
    });
    // Still mark active even if tier is unknown
    await supabase
      .from("entitlements")
      .upsert(
        { business_id: businessId, tier: "starter", is_active: true, profile_cap: 25, is_unlimited: false },
        { onConflict: "business_id" }
      );
    return;
  }

  log("syncEntitlements: applying tier", { businessId, ...mapped });
  await supabase
    .from("entitlements")
    .upsert(
      {
        business_id: businessId,
        tier: mapped.tier,
        is_active: true,
        profile_cap: mapped.profile_cap,
        is_unlimited: mapped.is_unlimited,
      },
      { onConflict: "business_id" }
    );
}

// ──────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 1. Validate stripe-signature header
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    log("Missing stripe-signature header");
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // 2. Read raw body and verify signature
  const rawBody = await req.text();
  if (!webhookSecret) {
    log("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    log("Invalid signature", { error: String(err) });
    return new Response("Invalid signature", { status: 400 });
  }

  log("Event received", { id: event.id, type: event.type });

  // 3. Use event.data.object for all data — no JSON.parse(rawBody)
  const dataObject = event.data.object as Record<string, unknown>;

  // Extract customer/subscription IDs when available
  const stripeCustomerId =
    (dataObject.customer as string) ?? (dataObject.id as string) ?? null;
  const stripeSubscriptionId =
    (dataObject.subscription as string) ?? (dataObject.id as string) ?? null;

  // 4. Idempotency: INSERT billing_events
  const { data: inserted, error: insertErr } = await supabase
    .from("billing_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: dataObject,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
    })
    .select("id")
    .maybeSingle();

  if (insertErr) {
    // Unique constraint violation = already processed
    if (insertErr.code === "23505") {
      log("Duplicate event, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    log("billing_events insert error", { error: insertErr.message });
    // Still return 200 to avoid Stripe retries on transient DB issues
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const billingEventId = inserted?.id;

  // ──────────────────────────────────────────
  // Event handling
  // ──────────────────────────────────────────

  if (event.type === "checkout.session.completed") {
    const session = dataObject as unknown as Stripe.Checkout.Session;
    const custId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    const bizId = session.metadata?.business_id ?? session.client_reference_id;

    if (custId && bizId) {
      await supabase
        .from("billing_customers")
        .upsert(
          { business_id: bizId, stripe_customer_id: custId },
          { onConflict: "business_id" }
        );
      // Update billing_events with resolved business_id
      if (billingEventId) {
        await supabase
          .from("billing_events")
          .update({ business_id: bizId })
          .eq("id", billingEventId);
      }
      log("checkout.session.completed: upserted billing_customers", { custId, bizId });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = dataObject as unknown as Stripe.Subscription;
    const custId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

    if (!custId) {
      log("No customer ID on subscription event");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Resolve business_id
    const businessId = await resolveBusinessId(custId);

    if (!businessId) {
      log("Could not resolve business_id, marking resolution_failed", { custId });
      if (billingEventId) {
        await supabase
          .from("billing_events")
          .update({ resolution_failed: true })
          .eq("id", billingEventId);
      }
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update billing_events with resolved business_id
    if (billingEventId) {
      await supabase
        .from("billing_events")
        .update({ business_id: businessId })
        .eq("id", billingEventId);
    }

    const { priceId, productId } = extractSubscriptionFields(sub);

    if (event.type === "customer.subscription.deleted") {
      // Update existing subscription record
      await supabase
        .from("billing_subscriptions")
        .update({
          status: sub.status,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          stripe_price_id: priceId,
          stripe_product_id: productId,
        })
        .eq("business_id", businessId);

      // Deterministic downgrade
      await syncEntitlements(businessId, sub.status, priceId, productId);
    } else {
      // created or updated — UPSERT billing_subscriptions
      await supabase
        .from("billing_subscriptions")
        .upsert(
          {
            business_id: businessId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: custId,
            stripe_price_id: priceId,
            stripe_product_id: productId,
            status: sub.status,
            trial_end: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
          },
          { onConflict: "business_id" }
        );

      await syncEntitlements(businessId, sub.status, priceId, productId);
    }

    log("Subscription event processed", {
      type: event.type,
      businessId,
      status: sub.status,
      priceId,
      productId,
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Unhandled event type — still return 200
  log("Unhandled event type", { type: event.type });
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
