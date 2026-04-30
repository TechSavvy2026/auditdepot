import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/components/dashboard/DashboardLayout";
import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function MyBids() {
  const { firm } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState<any[]>([]);

  useEffect(() => {
    if (!firm) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("bids")
        .select("*, rfp:rfps(id, title, status, state, bid_deadline, entity:entities(name))")
        .eq("firm_id", firm.id)
        .order("submitted_at", { ascending: false });
      setBids(data ?? []);
      setLoading(false);
    })();
  }, [firm]);

  if (!firm) {
    return <div className="p-8 text-sm text-gray-500">Set up your firm profile to view bids.</div>;
  }

  const statusMap: Record<string, { label: string; variant: "blue" | "green" | "amber" | "red" | "purple" | "gray" }> = {
    submitted: { label: "Submitted", variant: "blue" },
    under_review: { label: "Under review", variant: "purple" },
    shortlisted: { label: "Shortlisted", variant: "amber" },
    awarded: { label: "Awarded", variant: "green" },
    rejected: { label: "Not selected", variant: "gray" },
    withdrawn: { label: "Withdrawn", variant: "red" },
  };

  return (
    <div>
      <PageHeader
        title="My Bids"
        subtitle={`${bids.length} total`}
        action={<Link to="/dashboard/browse" className="btn-primary">Browse RFPs</Link>}
      />
      <div className="p-6">
        {loading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : bids.length === 0 ? (
          <div className="card text-center py-12">
            <h2 className="font-medium mb-1 text-sm">No bids yet</h2>
            <p className="text-xs text-gray-500 mb-4">Browse open RFPs to submit your first bid.</p>
            <Link to="/dashboard/browse" className="btn-primary text-xs">Browse RFPs</Link>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">RFP</th>
                  <th className="text-left px-4 py-2.5 font-medium">Bid amount</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bids.map((b) => {
                  const rfp = Array.isArray(b.rfp) ? b.rfp[0] : b.rfp;
                  const ent = rfp?.entity ? (Array.isArray(rfp.entity) ? rfp.entity[0] : rfp.entity) : null;
                  const cfg = statusMap[b.status] ?? { label: b.status, variant: "gray" as const };
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/dashboard/browse/${rfp?.id ?? b.rfp_id}`} className="font-medium text-gray-900 hover:text-brand-600">
                          {rfp?.title ?? "RFP"}
                        </Link>
                        <div className="text-xs text-gray-400 mt-0.5">{ent?.name ?? ""} · {rfp?.state ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(b.annual_fee)}/yr</td>
                      <td className="px-4 py-3"><StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(b.submitted_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
