import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/components/dashboard/DashboardLayout";
import { PageHeader, contractStatusBadge, invoiceStatusBadge } from "@/components/ui-kit";
import { formatCurrency, formatDate, getStateNameFromCode, CONTRACT_STATUS_LABELS, AUDIT_TYPE_LABELS } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SIGNING_STATUSES = ["pending_signature", "pending_govt_sig", "pending_firm_sig", "fully_executed"];

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, entity, firm } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [signingInProgress, setSigningInProgress] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);
  const [confirmInvoiceId, setConfirmInvoiceId] = useState<string | null>(null);

  const isEntityOwner = role === "entity_user" && entity;
  const isFirmOwner = role === "firm_user" && firm;

  async function loadContract() {
    if (!id) return;
    const { data } = await supabase
      .from("contracts")
      .select("*, rfp:rfps(id, title, state, audit_type, bid_deadline, description, contract_term_years, fiscal_years, fiscal_year_end), entity:entities(id, name, entity_type, state, city, contact_name, contact_email), firm:firms(id, name, state, city, contact_name, contact_email), bid:bids(id, annual_fee, proposed_timeline, estimated_hours, cover_letter)")
      .eq("id", id)
      .maybeSingle();
    setContract(data);
    setLoading(false);
  }

  async function loadInvoices() {
    if (!id) return;
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("contract_id", id)
      .order("created_at", { ascending: false });
    setInvoices(data ?? []);
  }

  useEffect(() => { loadContract(); loadInvoices(); }, [id]);

  async function markInvoicePaid(invoiceId: string) {
    setUpdatingInvoiceId(invoiceId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("invoices")
      .update({
        status: "paid" as any,
        paid_at: new Date().toISOString(),
        paid_by: user?.id ?? null,
      } as any)
      .eq("id", invoiceId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invoice marked as paid" });
      await loadInvoices();
    }
    setUpdatingInvoiceId(null);
  }

  async function updateStatus(newStatus: string) {
    if (!id) return;
    setUpdating(true);
    const { error } = await supabase.from("contracts").update({ status: newStatus as any }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Contract marked as ${CONTRACT_STATUS_LABELS[newStatus] ?? newStatus}` });
      await loadContract();
    }
    setUpdating(false);
  }

  async function handleStartSigning() {
    if (!id) return;
    setSigningInProgress(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("docuseal-signing", {
        body: { action: "start_signing", contract_id: id },
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setShowManualFallback(true);
        return;
      }

      if (resp?.error === "docuseal_not_configured") {
        setShowManualFallback(true);
        toast({
          title: "DocuSeal not configured",
          description: "You can continue with manual signing below.",
        });
        return;
      }

      if (resp?.error) {
        toast({ title: "Error", description: resp.error, variant: "destructive" });
        setShowManualFallback(true);
        return;
      }

      toast({ title: "Signing initiated", description: "Signing requests have been sent to both parties." });
      await loadContract();
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "Failed to start signing", variant: "destructive" });
      setShowManualFallback(true);
    } finally {
      setSigningInProgress(false);
    }
  }

  async function handleManualStartSigning() {
    if (!id) return;
    setUpdating(true);
    const { error } = await supabase.from("contracts").update({ status: "pending_govt_sig" as any }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Manual signing started", description: "Entity can now sign the contract." });
      setShowManualFallback(false);
      await loadContract();
    }
    setUpdating(false);
  }

  async function handleManualEntitySign() {
    if (!id) return;
    setSigningInProgress(true);
    const now = new Date().toISOString();
    const signerName = (entity as any)?.contact_name ?? entity?.name ?? "Entity Representative";
    const { error } = await supabase.from("contracts").update({
      govt_signed_at: now,
      govt_signer_name: signerName,
      status: "pending_firm_sig" as any,
    } as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entity signature recorded" });
      await loadContract();
    }
    setSigningInProgress(false);
  }

  async function handleManualFirmSign() {
    if (!id) return;
    setSigningInProgress(true);
    const now = new Date().toISOString();
    const signerName = (firm as any)?.contact_name ?? firm?.name ?? "Firm Representative";
    const { error } = await supabase.from("contracts").update({
      firm_signed_at: now,
      firm_signer_name: signerName,
      status: "active" as any,
      effective_date: new Date().toISOString().split("T")[0],
    } as any).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Firm signature recorded — contract is now active!" });
      await loadContract();
    }
    setSigningInProgress(false);
  }

  async function handleRecordSignature() {
    if (!id) return;
    setSigningInProgress(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("docuseal-signing", {
        body: { action: "record_signature", contract_id: id },
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      if (resp?.error) {
        toast({ title: "Error", description: resp.error, variant: "destructive" });
        return;
      }

      toast({ title: "Signature recorded successfully" });
      await loadContract();
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "Failed to record signature", variant: "destructive" });
    } finally {
      setSigningInProgress(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (!contract) return <div className="p-8 text-sm text-gray-500">Contract not found.</div>;

  const rfp = Array.isArray(contract.rfp) ? contract.rfp[0] : contract.rfp;
  const ent = Array.isArray(contract.entity) ? contract.entity[0] : contract.entity;
  const firmData = Array.isArray(contract.firm) ? contract.firm[0] : contract.firm;
  const bid = Array.isArray(contract.bid) ? contract.bid[0] : contract.bid;

  // Signing flow permissions
  const canStartSigning = isEntityOwner && contract.status === "pending_signature";
  const canEntitySign = isEntityOwner && contract.status === "pending_govt_sig" && !contract.govt_signed_at;
  const canFirmSign = isFirmOwner && contract.status === "pending_firm_sig" && !contract.firm_signed_at;
  const canComplete = isEntityOwner && contract.status === "active";
  const isInSigningFlow = SIGNING_STATUSES.includes(contract.status);

  // Signing progress
  const signingSteps = [
    { label: "Contract created", done: true },
    { label: "Entity signs", done: !!contract.govt_signed_at },
    { label: "Firm signs", done: !!contract.firm_signed_at },
    { label: "Active", done: contract.status === "active" || contract.status === "completed" },
  ];
  const completedSteps = signingSteps.filter((s) => s.done).length;
  const progressPct = Math.round((completedSteps / signingSteps.length) * 100);

  return (
    <div>
      <PageHeader
        title={rfp?.title ?? "Contract"}
        subtitle={`${ent?.name ?? "Entity"} ↔ ${firmData?.name ?? "Firm"}`}
        action={<Link to="/dashboard/contracts" className="text-sm text-gray-500 hover:text-gray-900">← Back to Contracts</Link>}
      />
      <div className="p-6 max-w-4xl space-y-6">
        {/* Status + Actions */}
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Status:</span>
            {contractStatusBadge(contract.status)}
          </div>
          <div className="flex flex-wrap gap-2">
            {canStartSigning && !showManualFallback && (
              <button
                className="btn-primary text-xs px-3 py-1.5"
                disabled={signingInProgress}
                onClick={handleStartSigning}
              >
                {signingInProgress ? "Starting…" : "✍️ Start Signing"}
              </button>
            )}
            {canStartSigning && showManualFallback && (
              <button
                className="btn-primary text-xs px-3 py-1.5 bg-amber-600 border-amber-600 hover:bg-amber-700"
                disabled={updating}
                onClick={handleManualStartSigning}
              >
                📝 Continue with manual signing (demo mode)
              </button>
            )}
            {canEntitySign && (
              <button
                className="btn-primary text-xs px-3 py-1.5"
                disabled={signingInProgress}
                onClick={contract.docuseal_submission_id ? handleRecordSignature : handleManualEntitySign}
              >
                {signingInProgress ? "Signing…" : "✍️ Sign as Entity"}
              </button>
            )}
            {canFirmSign && (
              <button
                className="btn-primary text-xs px-3 py-1.5"
                disabled={signingInProgress}
                onClick={contract.docuseal_submission_id ? handleRecordSignature : handleManualFirmSign}
              >
                {signingInProgress ? "Signing…" : "✍️ Sign as Firm"}
              </button>
            )}
            {canComplete && (
              <button
                className="btn-primary text-xs px-3 py-1.5 bg-green-600 border-green-600 hover:bg-green-700"
                disabled={updating}
                onClick={() => updateStatus("completed")}
              >
                {updating ? "Updating…" : "Mark Completed"}
              </button>
            )}
          </div>
        </div>

        {/* Signing Progress Tracker */}
        {(isInSigningFlow || contract.status === "active") && (
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold">Signing Progress</h2>
            <Progress value={progressPct} className="h-2" />
            <div className="grid grid-cols-4 gap-2">
              {signingSteps.map((step, i) => (
                <div key={i} className="text-center">
                  <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                    step.done
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                  }`}>
                    {step.done ? "✓" : i + 1}
                  </div>
                  <div className={`text-xs ${step.done ? "text-green-700 font-medium" : "text-gray-400"}`}>
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
            {contract.govt_signed_at && (
              <div className="text-xs text-gray-500">
                Entity signed: {formatDate(contract.govt_signed_at)}
                {contract.govt_signer_name && ` by ${contract.govt_signer_name}`}
              </div>
            )}
            {contract.firm_signed_at && (
              <div className="text-xs text-gray-500">
                Firm signed: {formatDate(contract.firm_signed_at)}
                {contract.firm_signer_name && ` by ${contract.firm_signer_name}`}
              </div>
            )}
            {contract.fully_executed_at && (
              <div className="text-xs text-green-600 font-medium">
                Fully executed: {formatDate(contract.fully_executed_at)}
              </div>
            )}
          </div>
        )}

        {/* Contract Details */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold">Contract Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Detail label="RFP" value={rfp?.title ?? "—"} />
            <Detail label="Entity" value={ent?.name ?? "—"} />
            <Detail label="Firm" value={firmData?.name ?? "—"} />
            <Detail label="Annual fee" value={formatCurrency(contract.annual_fee_cents)} />
            <Detail label="Contract term" value={`${contract.contract_term_years} year${contract.contract_term_years !== 1 ? "s" : ""}`} />
            <Detail label="Total value" value={formatCurrency(contract.total_value_cents)} />
            <Detail label="Platform fee" value={`${formatCurrency(contract.platform_fee_cents)} (${contract.platform_fee_pct}%)`} />
            <Detail label="State" value={rfp?.state ? getStateNameFromCode(rfp.state) : "—"} />
            <Detail label="Audit type" value={rfp?.audit_type ? (AUDIT_TYPE_LABELS[rfp.audit_type] ?? rfp.audit_type) : "—"} />
            <Detail label="Created" value={formatDate(contract.created_at)} />
            {contract.effective_date && <Detail label="Effective date" value={formatDate(contract.effective_date)} />}
            {contract.expiration_date && <Detail label="Expiration date" value={formatDate(contract.expiration_date)} />}
          </div>
          {contract.scope_of_work && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Scope of Work</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{contract.scope_of_work}</p>
            </div>
          )}
        </div>

        {/* Winning bid */}
        {bid && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold">Winning Bid</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Detail label="Bid amount" value={`${formatCurrency(bid.annual_fee)}/yr`} />
              <Detail label="Timeline" value={bid.proposed_timeline ?? "—"} />
              <Detail label="Estimated hours" value={bid.estimated_hours ? `${bid.estimated_hours} hrs` : "—"} />
            </div>
            {bid.cover_letter && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Proposal</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{bid.cover_letter}</p>
              </div>
            )}
          </div>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold">Invoices</h2>
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                <div>
                  <div className="text-sm font-medium">{formatCurrency(inv.amount_cents)}</div>
                  <div className="text-xs text-gray-500">Due {formatDate(inv.due_date)}</div>
                  {inv.status === "paid" && inv.paid_at && (
                    <div className="text-xs text-green-700 mt-1">
                      Paid on {formatDate(inv.paid_at)}{ent?.name ? ` by ${ent.name}` : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {invoiceStatusBadge(inv.status, inv.due_date)}
                  {isEntityOwner && inv.status !== "paid" && inv.status !== "void" && inv.status !== "draft" && (
                    <button
                      className="btn-primary text-xs px-3 py-1"
                      disabled={updatingInvoiceId === inv.id}
                      onClick={() => setConfirmInvoiceId(inv.id)}
                    >
                      {updatingInvoiceId === inv.id ? "…" : "Mark Paid"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}


        {contract.docuseal_submission_id && (
          <div className="card">
            <h2 className="text-sm font-semibold mb-2">Document Signing</h2>
            <div className="text-xs text-gray-500">
              Submission ID: <span className="font-mono">{contract.docuseal_submission_id}</span>
            </div>
            {contract.signed_pdf_url && (
              <a href={contract.signed_pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline mt-1 inline-block">
                View signed document →
              </a>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmInvoiceId} onOpenChange={(open) => { if (!open) setConfirmInvoiceId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark invoice as paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the invoice status to paid. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmInvoiceId) markInvoicePaid(confirmInvoiceId);
                setConfirmInvoiceId(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
