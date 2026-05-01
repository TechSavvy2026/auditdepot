import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/components/dashboard/DashboardLayout";
import { PageHeader, rfpStatusBadge, StatusBadge } from "@/components/ui-kit";
import { formatCurrency, formatDate, AUDIT_TYPE_LABELS, ENTITY_TYPE_LABELS, getStateNameFromCode } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const bidSchema = z.object({
  annual_fee: z.string().min(1, "Bid amount is required"),
  cover_letter: z.string().trim().min(10, "Proposal must be at least 10 characters").max(5000),
  proposed_timeline: z.string().trim().max(1000).optional(),
  estimated_hours: z.string().optional(),
});

export default function RfpDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, entity, firm } = useDashboard();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rfp, setRfp] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [showBidForm, setShowBidForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingOnBid, setActingOnBid] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bidForm, setBidForm] = useState({
    annual_fee: "",
    cover_letter: "",
    proposed_timeline: "",
    estimated_hours: "",
  });

  const isEntityOwner = role === "entity_user" && entity;
  const isFirmUser = role === "firm_user" && firm;

  async function loadData() {
    if (!id) return;
    const { data: rfpData } = await supabase
      .from("rfps")
      .select("*, entity:entities(id, name, entity_type, state, city)")
      .eq("id", id)
      .maybeSingle();

    if (!rfpData) { setLoading(false); return; }
    setRfp(rfpData);

    if (isEntityOwner) {
      const { data: bidData } = await supabase
        .from("bids")
        .select("*, firm:firms(id, name, state, verified)")
        .eq("rfp_id", id)
        .order("submitted_at", { ascending: false });
      setBids(bidData ?? []);
    } else if (isFirmUser) {
      const { data: bidData } = await supabase
        .from("bids")
        .select("*")
        .eq("rfp_id", id)
        .eq("firm_id", firm!.id);
      setBids(bidData ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id, role, entity, firm]);

  async function handleAcceptBid(bid: any) {
    if (!id || !entity) return;
    setActingOnBid(bid.id);
    try {
      // Award this bid
      const { error: e1 } = await supabase.from("bids").update({ status: "awarded" }).eq("id", bid.id);
      if (e1) throw e1;

      // Reject all other bids
      const { error: e2 } = await supabase
        .from("bids")
        .update({ status: "rejected" })
        .eq("rfp_id", id)
        .neq("id", bid.id);
      if (e2) throw e2;

      // Update RFP status
      const { error: e3 } = await supabase
        .from("rfps")
        .update({ status: "awarded", awarded_bid_id: bid.id })
        .eq("id", id);
      if (e3) throw e3;

      // Create contract
      const annualFee = bid.annual_fee;
      const termYears = rfp.contract_term_years ?? 3;
      const totalValue = annualFee * termYears;
      const platformFeePct = 5;
      const platformFee = Math.round(totalValue * platformFeePct / 100);

      const { error: e4 } = await supabase.from("contracts").insert({
        rfp_id: id,
        bid_id: bid.id,
        entity_id: entity.id,
        firm_id: bid.firm_id,
        annual_fee_cents: annualFee,
        contract_term_years: termYears,
        total_value_cents: totalValue,
        platform_fee_cents: platformFee,
        platform_fee_pct: platformFeePct,
        status: "pending_signature",
      });
      if (e4) throw e4;

      toast({ title: "Bid accepted", description: "A contract has been created for this engagement." });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActingOnBid(null);
    }
  }

  async function handleRejectBid(bidId: string) {
    setActingOnBid(bidId);
    try {
      const { error } = await supabase.from("bids").update({ status: "rejected" }).eq("id", bidId);
      if (error) throw error;
      toast({ title: "Bid rejected" });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActingOnBid(null);
    }
  }

  function updateBid<K extends keyof typeof bidForm>(k: K, v: string) {
    setBidForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmitBid(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = bidSchema.safeParse(bidForm);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }

    const feeNum = Number(parsed.data.annual_fee.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(feeNum) || feeNum <= 0) {
      setErrors({ annual_fee: "Enter a valid positive amount" });
      return;
    }
    const hoursNum = parsed.data.estimated_hours
      ? Number(parsed.data.estimated_hours.replace(/[^\d]/g, ""))
      : null;

    setSubmitting(true);
    const { error } = await supabase.from("bids").insert({
      rfp_id: id!,
      firm_id: firm!.id,
      annual_fee: Math.round(feeNum * 100), // cents
      cover_letter: parsed.data.cover_letter,
      proposed_timeline: parsed.data.proposed_timeline || null,
      estimated_hours: hoursNum,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Could not submit bid", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Bid submitted", description: "The entity will review your proposal." });
    navigate("/dashboard/bids");
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (!rfp) return <div className="p-8 text-sm text-gray-500">RFP not found.</div>;

  const ent = Array.isArray(rfp.entity) ? rfp.entity[0] : rfp.entity;
  const alreadyBid = isFirmUser && bids.length > 0;
  const canBid = isFirmUser && !alreadyBid && ["open", "closing_soon"].includes(rfp.status);

  return (
    <div>
      <PageHeader
        title={rfp.title}
        subtitle={`${ent?.name ?? "Entity"} · ${getStateNameFromCode(rfp.state)}`}
        action={
          isEntityOwner ? (
            <Link to="/dashboard/rfps" className="text-sm text-gray-500 hover:text-gray-900">← Back to My RFPs</Link>
          ) : (
            <Link to="/dashboard/browse" className="text-sm text-gray-500 hover:text-gray-900">← Back to Browse</Link>
          )
        }
      />

      <div className="p-6 max-w-4xl space-y-6">
        {/* RFP Details Card */}
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{rfp.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                {AUDIT_TYPE_LABELS[rfp.audit_type] ?? rfp.audit_type} · Posted {formatDate(rfp.created_at)}
              </p>
            </div>
            {rfpStatusBadge(rfp.status)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-y border-gray-100">
            <Detail label="Budget" value={rfp.budget_max ? formatCurrency(rfp.budget_max) : "Not specified"} />
            <Detail label="Deadline" value={formatDate(rfp.bid_deadline)} />
            <Detail label="State" value={getStateNameFromCode(rfp.state)} />
            <Detail label="Entity type" value={ENTITY_TYPE_LABELS[ent?.entity_type] ?? ent?.entity_type ?? "—"} />
          </div>

          {rfp.description && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{rfp.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Detail label="Contract term" value={`${rfp.contract_term_years} year${rfp.contract_term_years !== 1 ? "s" : ""}`} />
            <Detail label="Fiscal year end" value={rfp.fiscal_year_end ?? "—"} />
            <Detail label="Entity" value={ent?.name ?? "—"} />
          </div>
        </div>

        {/* Firm: bid actions */}
        {canBid && !showBidForm && (
          <div className="card text-center py-8">
            <p className="text-sm text-gray-600 mb-3">Interested in this engagement?</p>
            <button className="btn-primary" onClick={() => setShowBidForm(true)}>Submit a Bid</button>
          </div>
        )}

        {alreadyBid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="font-medium text-green-800 text-sm">You've already submitted a bid for this RFP</div>
            <div className="text-xs text-green-700 mt-0.5">
              Bid: {formatCurrency(bids[0].annual_fee)}/yr · Status: {bids[0].status}
            </div>
            <Link to="/dashboard/bids" className="text-xs text-green-700 underline mt-1 inline-block">View my bids →</Link>
          </div>
        )}

        {/* Bid Form */}
        {showBidForm && (
          <form onSubmit={onSubmitBid} className="card space-y-5">
            <h3 className="text-sm font-semibold">Submit your bid</h3>

            <Field label="Annual fee (USD)" error={errors.annual_fee} required>
              <input
                className="input"
                inputMode="decimal"
                placeholder="45000"
                value={bidForm.annual_fee}
                onChange={(e) => updateBid("annual_fee", e.target.value)}
              />
              <div className="text-xs text-gray-400 mt-1">Your proposed annual audit fee in dollars</div>
            </Field>

            <Field label="Proposal / Cover letter" error={errors.cover_letter} required>
              <textarea
                className="input min-h-[140px]"
                placeholder="Describe your firm's qualifications, approach, and why you're a great fit…"
                value={bidForm.cover_letter}
                onChange={(e) => updateBid("cover_letter", e.target.value)}
                maxLength={5000}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Proposed timeline" error={errors.proposed_timeline}>
                <input
                  className="input"
                  placeholder="e.g. 6 weeks from engagement"
                  value={bidForm.proposed_timeline}
                  onChange={(e) => updateBid("proposed_timeline", e.target.value)}
                  maxLength={1000}
                />
              </Field>
              <Field label="Estimated hours" error={errors.estimated_hours}>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="e.g. 200"
                  value={bidForm.estimated_hours}
                  onChange={(e) => updateBid("estimated_hours", e.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-900"
                onClick={() => setShowBidForm(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Bid"}
              </button>
            </div>
          </form>
        )}

        {/* Entity: view bids on this RFP */}
        {isEntityOwner && (
          <div className="card">
            <h3 className="text-sm font-semibold mb-4">Bids received ({bids.length})</h3>
            {bids.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No bids yet. Share this RFP to attract audit firms.</p>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => {
                  const bidFirm = Array.isArray(bid.firm) ? bid.firm[0] : bid.firm;
                  return (
                    <div key={bid.id} className="border border-gray-100 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{bidFirm?.name ?? "Audit firm"}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {bidFirm?.state ? getStateNameFromCode(bidFirm.state) : ""} 
                            {bidFirm?.verified && " · ✓ Verified"}
                          </div>
                          <div className="text-sm text-gray-700 mt-2">
                            <span className="font-medium">{formatCurrency(bid.annual_fee)}</span>/yr
                            {bid.estimated_hours && <span className="text-gray-400 ml-2">· {bid.estimated_hours} hrs</span>}
                          </div>
                          {bid.proposed_timeline && (
                            <div className="text-xs text-gray-500 mt-1">Timeline: {bid.proposed_timeline}</div>
                          )}
                          {bid.cover_letter && (
                            <p className="text-xs text-gray-600 mt-2 line-clamp-3">{bid.cover_letter}</p>
                          )}
                        </div>
                        <BidStatusBadge status={bid.status} />
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-gray-400">Submitted {formatDate(bid.submitted_at)}</div>
                        {bid.status === "submitted" && rfp.status !== "awarded" && (
                          <div className="flex gap-2">
                            <button
                              className="text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                              disabled={actingOnBid === bid.id}
                              onClick={() => handleRejectBid(bid.id)}
                            >
                              Reject
                            </button>
                            <button
                              className="btn-primary text-xs px-3 py-1.5"
                              disabled={actingOnBid === bid.id}
                              onClick={() => handleAcceptBid(bid)}
                            >
                              {actingOnBid === bid.id ? "Processing…" : "Accept Bid"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function Field({
  label, error, required, children,
}: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      {children}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </label>
  );
}

function BidStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "blue" | "green" | "amber" | "red" | "purple" | "gray" }> = {
    submitted: { label: "Submitted", variant: "blue" },
    under_review: { label: "Under review", variant: "purple" },
    shortlisted: { label: "Shortlisted", variant: "amber" },
    awarded: { label: "Awarded", variant: "green" },
    rejected: { label: "Not selected", variant: "gray" },
    withdrawn: { label: "Withdrawn", variant: "red" },
  };
  const cfg = map[status] ?? { label: status, variant: "gray" as const };
  return <StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge>;
}
