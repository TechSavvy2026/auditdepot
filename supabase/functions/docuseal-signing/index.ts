import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    if (!anonKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing anon key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, contract_id } = await req.json();

    if (!contract_id) {
      return new Response(JSON.stringify({ error: "contract_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load contract with related data
    const { data: contract, error: cErr } = await supabaseAdmin
      .from("contracts")
      .select("*, rfp:rfps(title, state, audit_type, description, fiscal_years, contract_term_years, fiscal_year_end), entity:entities(id, name, owner_id, contact_name, contact_email, state, city), firm:firms(id, name, owner_id, contact_name, contact_email, state, city), bid:bids(annual_fee, proposed_timeline, estimated_hours, cover_letter)")
      .eq("id", contract_id)
      .maybeSingle();

    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const entity = Array.isArray(contract.entity) ? contract.entity[0] : contract.entity;
    const firm = Array.isArray(contract.firm) ? contract.firm[0] : contract.firm;

    // Verify caller is entity owner or firm owner
    const isEntityOwner = entity?.owner_id === user.id;
    const isFirmOwner = firm?.owner_id === user.id;
    if (!isEntityOwner && !isFirmOwner) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DOCUSEAL_API_KEY = Deno.env.get("DOCUSEAL_API_KEY");

    if (action === "start_signing") {
      // Only entity owner can start signing
      if (!isEntityOwner) {
        return new Response(JSON.stringify({ error: "Only the entity owner can start signing" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (contract.status !== "pending_signature") {
        return new Response(JSON.stringify({ error: "Contract is not in pending_signature status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!DOCUSEAL_API_KEY) {
        return new Response(JSON.stringify({ error: "docuseal_not_configured" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rfp = Array.isArray(contract.rfp) ? contract.rfp[0] : contract.rfp;
      const bid = Array.isArray(contract.bid) ? contract.bid[0] : contract.bid;

      // Create DocuSeal submission from template
      const templateRes = await fetch("https://api.docuseal.com/submissions", {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: Deno.env.get("DOCUSEAL_TEMPLATE_ID") ? Number(Deno.env.get("DOCUSEAL_TEMPLATE_ID")) : undefined,
          send_email: true,
          submitters: [
            {
              name: entity?.contact_name || entity?.name || "Entity Signer",
              email: entity?.contact_email || user.email,
              role: "Entity Representative",
              fields: [
                { name: "entity_name", default_value: entity?.name ?? "" },
                { name: "firm_name", default_value: firm?.name ?? "" },
                { name: "rfp_title", default_value: rfp?.title ?? "" },
                { name: "annual_fee", default_value: String(bid?.annual_fee ?? contract.annual_fee_cents) },
                { name: "contract_term", default_value: String(contract.contract_term_years) },
              ],
            },
            {
              name: firm?.contact_name || firm?.name || "Firm Signer",
              email: firm?.contact_email || "",
              role: "Audit Firm Representative",
              fields: [
                { name: "entity_name", default_value: entity?.name ?? "" },
                { name: "firm_name", default_value: firm?.name ?? "" },
              ],
            },
          ],
        }),
      });

      if (!templateRes.ok) {
        const errBody = await templateRes.text();
        console.error("DocuSeal API error:", errBody);
        return new Response(JSON.stringify({ error: "DocuSeal API error", details: errBody }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const submission = await templateRes.json();
      const submissionId = String(submission.id ?? submission[0]?.submission_id ?? "");

      // Update contract with submission ID and move to pending_govt_sig
      await supabaseAdmin.from("contracts").update({
        docuseal_submission_id: submissionId,
        status: "pending_govt_sig",
      }).eq("id", contract_id);

      return new Response(JSON.stringify({ 
        success: true, 
        submission_id: submissionId,
        signing_url: submission[0]?.embed_src ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "record_signature") {
      // Record a signature for the current user
      const now = new Date().toISOString();

      if (isEntityOwner && !contract.govt_signed_at) {
        await supabaseAdmin.from("contracts").update({
          govt_signed_at: now,
          govt_signer_name: entity?.contact_name || user.email,
          status: "pending_firm_sig",
        }).eq("id", contract_id);

        return new Response(JSON.stringify({ success: true, next: "pending_firm_sig" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (isFirmOwner && !contract.firm_signed_at) {
        await supabaseAdmin.from("contracts").update({
          firm_signed_at: now,
          firm_signer_name: firm?.contact_name || user.email,
          status: "fully_executed",
          fully_executed_at: now,
        }).eq("id", contract_id);

        // Auto-transition to active
        await supabaseAdmin.from("contracts").update({
          status: "active",
          effective_date: new Date().toISOString().split("T")[0],
        }).eq("id", contract_id);

        return new Response(JSON.stringify({ success: true, next: "active" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Signature already recorded or not your turn" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_status") {
      // Return current signing status
      return new Response(JSON.stringify({
        status: contract.status,
        govt_signed_at: contract.govt_signed_at,
        firm_signed_at: contract.firm_signed_at,
        fully_executed_at: contract.fully_executed_at,
        docuseal_submission_id: contract.docuseal_submission_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("docuseal-signing error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
