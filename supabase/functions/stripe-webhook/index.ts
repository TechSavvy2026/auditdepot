// Stripe webhook: marks invoice paid when checkout.session.completed (or payment_intent.succeeded).
// Public endpoint — verifies Stripe signature using STRIPE_WEBHOOK_SECRET. No JWT required.
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret);
  } catch (e: any) {
    console.error("Bad signature", e?.message);
    return new Response(`Bad signature: ${e?.message}`, { status: 400 });
  }

  // Service role to bypass RLS — webhook is server-to-server.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let invoiceId: string | undefined;
    let stripePaymentIntent: string | undefined;
    let stripeInvoiceId: string | undefined;

    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      invoiceId = s.metadata?.invoice_id;
      stripePaymentIntent = typeof s.payment_intent === "string" ? s.payment_intent : undefined;
      stripeInvoiceId = s.id;
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      invoiceId = pi.metadata?.invoice_id;
      stripePaymentIntent = pi.id;
    } else {
      return new Response(JSON.stringify({ received: true, ignored: event.type }), { status: 200 });
    }

    if (!invoiceId) {
      console.warn("No invoice_id in event metadata", event.type);
      return new Response(JSON.stringify({ received: true, missing_metadata: true }), { status: 200 });
    }

    const { error } = await admin
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        stripe_payment_intent: stripePaymentIntent ?? null,
        stripe_invoice_id: stripeInvoiceId ?? null,
      })
      .eq("id", invoiceId)
      .neq("status", "paid"); // idempotent

    if (error) {
      console.error("Update failed", error);
      return new Response(`Update failed: ${error.message}`, { status: 500 });
    }

    return new Response(JSON.stringify({ received: true, invoice_id: invoiceId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Webhook handler error", e);
    return new Response(`Handler error: ${e?.message}`, { status: 500 });
  }
});
