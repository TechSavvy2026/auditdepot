import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/components/dashboard/DashboardLayout";
import { PageHeader, rfpStatusBadge } from "@/components/ui-kit";
import { formatDate, formatCurrency, AUDIT_TYPE_LABELS, getStateNameFromCode } from "@/lib/utils";

export default function BrowseRfps() {
  const { firm } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [rfps, setRfps] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<string[]>([]);
  const [myBidRfpIds, setMyBidRfpIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      let licensedStates: string[] = [];
      if (firm) {
        const [{ data: lic }, { data: firmBids }] = await Promise.all([
          supabase.from("firm_licenses").select("state").eq("firm_id", firm.id),
          supabase.from("bids").select("rfp_id").eq("firm_id", firm.id),
        ]);
        licensedStates = (lic ?? []).map((l) => l.state);
        setLicenses(licensedStates);
        setMyBidRfpIds(new Set((firmBids ?? []).map((b) => b.rfp_id)));
      }

      let query = supabase
        .from("rfps")
        .select("*, entity:entities(name, entity_type, city), bids(id)")
        .in("status", ["open", "closing_soon"])
        .order("created_at", { ascending: false });

      if (licensedStates.length > 0) {
        query = query.in("state", licensedStates);
      }

      const { data } = await query;
      setRfps(data ?? []);
      setLoading(false);
    })();
  }, [firm]);

  return (
    <div>
      <PageHeader
        title="Browse RFPs"
        subtitle={
          licenses.length > 0
            ? `Showing RFPs in your licensed states (${licenses.join(", ")})`
            : "Showing all open RFPs"
        }
      />
      <div className="p-6">
        {loading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : rfps.length === 0 ? (
          <div className="card text-center py-12">
            <h2 className="font-medium mb-1 text-sm">No open RFPs found</h2>
            <p className="text-xs text-gray-500 mb-4">
              {licenses.length > 0
                ? "No RFPs match your licensed states right now. Check back soon."
                : "There are no open RFPs at this time."}
            </p>
            {licenses.length === 0 && firm && (
              <Link to="/dashboard/firm-profile" className="btn-primary text-xs">
                Add state licenses →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rfps.map((rfp) => {
              const ent = Array.isArray(rfp.entity) ? rfp.entity[0] : rfp.entity;
              const bidCount = rfp.bids?.length ?? 0;
              const alreadyBid = myBidRfpIds.has(rfp.id);
              return (
                <Link
                  key={rfp.id}
                  to={`/dashboard/browse/${rfp.id}`}
                  className="card block hover:border-brand-300 hover:shadow-sm transition-all p-0"
                >
                  <div className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{rfp.title}</h3>
                        {rfpStatusBadge(rfp.status)}
                      </div>
                      <div className="text-xs text-gray-500 space-x-2">
                        <span>{getStateNameFromCode(rfp.state)}{ent?.city ? `, ${ent.city}` : ""}</span>
                        <span>·</span>
                        <span>{AUDIT_TYPE_LABELS[rfp.audit_type] ?? rfp.audit_type}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Deadline: <span className="font-medium text-gray-700">{formatDate(rfp.bid_deadline)}</span></span>
                        <span>{bidCount} bid{bidCount !== 1 ? "s" : ""}</span>
                        {rfp.budget_max && <span>Budget: {formatCurrency(rfp.budget_max)}</span>}
                        <span>{ent?.name ?? ""}</span>
                      </div>
                    </div>
                    {alreadyBid ? (
                      <span className="text-xs px-3 py-1.5 flex-shrink-0 rounded-lg bg-gray-100 text-gray-500 font-medium">Bid submitted ✓</span>
                    ) : (
                      <span className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">Bid →</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
