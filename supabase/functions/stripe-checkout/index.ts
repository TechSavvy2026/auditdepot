// Creates a Stripe Checkout Session for an invoice and returns the hosted URL.
// Auth: requires a logged-in user (JWT). Verifies the user owns the invoice's entity.
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "stripe_not_configured" }, 200);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { invoice_id, return_url } = await req.json();
    if (!invoice_id) return json({ error: "invoice_id required" }, 400);

    // RLS scopes this read to invoices the caller can see
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, amount_cents, status, contract:contracts(id, entity_id, rfp:rfps(title), entity:entities(name, owner_id))")
      .eq("id", invoice_id)
      .maybeSingle();

    if (invErr || !invoice) return json({ error: "Invoice not found" }, 404);
    if (invoice.status === "paid") return json({ error: "Invoice already paid" }, 400);

    const contract: any = Array.isArray(invoice.contract) ? invoice.contract[0] : invoice.contract;
    const entity: any = contract && (Array.isArray(contract.entity) ? contract.entity[0] : contract.entity);
    const rfp: any = contract && (Array.isArray(contract.rfp) ? contract.rfp[0] : contract.rfp);

    if (!entity || entity.owner_id !== userId) {
      return json({ error: "Only the entity owner can pay this invoice" }, 403);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    const origin = req.headers.get("origin") ?? "https://app.example.com";
    const successUrl = return_url
      ? `${return_url}?paid=1&invoice=${invoice.id}`
      : `${origin}/dashboard/invoices?paid=1&invoice=${invoice.id}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Number(invoice.amount_cents),
            product_data: {
              name: `AuditDepot Invoice — ${rfp?.title ?? "Contract"}`,
              description: `Payer: ${entity.name}`,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: `${origin}/dashboard/invoices?cancelled=1`,
      metadata: { invoice_id: invoice.id, entity_owner_id: userId },
      payment_intent_data: { metadata: { invoice_id: invoice.id } },
    });

    return json({ url: session.url, session_id: session.id }, 200);
  } catch (e: any) {
    console.error("stripe-checkout error", e);
    return json({ error: e?.message ?? "checkout_failed" }, 500);
  }

  function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
