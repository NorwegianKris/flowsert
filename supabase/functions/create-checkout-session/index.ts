import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_PRICE_IDS = new Set([
  "price_1T4TiBCTVQHwswgoMCQBB0Kv",
  "price_1T4TipCTVQHwswgo3i7Wxi0p",
  "price_1T4TjxCTVQHwswgobYyRRe10",
  "price_1T4TkFCTVQHwswgop7yCPQRM",
  "price_1T4TksCTVQHwswgoItMP8J6n",
  "price_1T4Tl8CTVQHwswgoHkYuB2S9",
]);

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[create-checkout-session] ${step}${d}`);
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    log("Authenticated user", { userId });

    // 2. Verify admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Resolve business_id
    const { data: profileData } = await supabase
      .from("profiles")
      .select("business_id, email, full_name")
      .eq("id", userId)
      .maybeSingle();

    const businessId = profileData?.business_id;
    if (!businessId) {
      return new Response(JSON.stringify({ error: "No business found for user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("Resolved business", { businessId });

    // 4. Parse and validate price_id
    const { price_id } = await req.json();
    if (!price_id || !ALLOWED_PRICE_IDS.has(price_id)) {
      return new Response(JSON.stringify({ error: "Invalid price_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("Price validated", { price_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 5. Resolve or create Stripe customer
    let stripeCustomerId: string;

    const { data: existingCustomer } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("business_id", businessId)
      .maybeSingle();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
      log("Found existing Stripe customer", { stripeCustomerId });

      // Ensure metadata.business_id is set
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (!customer.deleted && !(customer as Stripe.Customer).metadata?.business_id) {
        await stripe.customers.update(stripeCustomerId, {
          metadata: { business_id: businessId },
        });
        log("Updated customer metadata with business_id");
      }
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: profileData.email || undefined,
        name: profileData.full_name || undefined,
        metadata: { business_id: businessId },
      });
      stripeCustomerId = customer.id;
      log("Created new Stripe customer", { stripeCustomerId });

      await supabase
        .from("billing_customers")
        .upsert(
          { business_id: businessId, stripe_customer_id: stripeCustomerId },
          { onConflict: "business_id" }
        );
    }

    // 6. Create Checkout Session
    const successUrl = Deno.env.get("STRIPE_SUCCESS_URL");
    const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL");

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: price_id, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { business_id: businessId },
      },
      client_reference_id: businessId,
      metadata: { business_id: businessId },
      success_url: successUrl || undefined,
      cancel_url: cancelUrl || undefined,
    });

    log("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
