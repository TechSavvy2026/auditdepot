import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/components/dashboard/DashboardLayout";
import { PageHeader, invoiceStatusBadge } from "@/components/ui-kit";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
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

export default function Invoices() {
  const { role, entity, firm } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const isEntity = role === "entity_user";

  async function load() {
    let query = supabase
      .from("invoices")
      .select("*, contract:contracts(id, rfp_id, rfp:rfps(id, title), entity:entities(id, name), firm:firms(id, name))")
      .order("created_at", { ascending: false });

    if (role === "firm_user" && firm) {
      query = query.eq("firm_id", firm.id);
    } else if (role === "entity_user" && entity) {
      query = query.eq("contract.entity_id", entity.id);
    }

    const { data } = await query;
    setInvoices(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [role, entity, firm]);

  async function markPaid(invoiceId: string) {
    setUpdatingId(invoiceId);
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
      await load();
    }
    setUpdatingId(null);
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  return (
    <div>
      <PageHeader title="Invoices" subtitle={`${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`} />
      <div className="p-6 max-w-4xl">
        {invoices.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-sm text-gray-500">No invoices yet.</p>
            <p className="text-xs text-gray-400 mt-1">Invoices are created automatically when contracts become active.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => {
              const contract = Array.isArray(inv.contract) ? inv.contract[0] : inv.contract;
              const rfp = contract ? (Array.isArray(contract.rfp) ? contract.rfp[0] : contract.rfp) : null;
              const ent = contract ? (Array.isArray(contract.entity) ? contract.entity[0] : contract.entity) : null;
              const f = contract ? (Array.isArray(contract.firm) ? contract.firm[0] : contract.firm) : null;
              const counterparty = role === "entity_user" ? f?.name : ent?.name;

              return (
                <div key={inv.id} className="card flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/dashboard/contracts/${inv.contract_id}`}
                      className="text-sm font-medium truncate hover:text-brand-600 transition-colors"
                    >
                      {rfp?.title ?? "Contract"}
                    </Link>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {counterparty ?? "—"} · Due {formatDate(inv.due_date)}
                    </div>
                    {inv.status === "paid" && inv.paid_at && (
                      <div className="text-xs text-green-700 mt-1">
                        Paid on {formatDate(inv.paid_at)}{ent?.name ? ` by ${ent.name}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="text-sm font-semibold">{formatCurrency(inv.amount_cents)}</div>
                      <div className="mt-0.5">{invoiceStatusBadge(inv.status, inv.due_date)}</div>
                    </div>
                    {isEntity && inv.status !== "paid" && inv.status !== "void" && inv.status !== "draft" && (
                      <button
                        className="btn-primary text-xs px-3 py-1.5"
                        disabled={updatingId === inv.id}
                        onClick={() => setConfirmId(inv.id)}
                      >
                        {updatingId === inv.id ? "Updating…" : "Mark Paid"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmId} onOpenChange={(open) => { if (!open) setConfirmId(null); }}>
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
                if (confirmId) markPaid(confirmId);
                setConfirmId(null);
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
