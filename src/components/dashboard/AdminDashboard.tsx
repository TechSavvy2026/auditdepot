import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ rfp: 0, firm: 0, entity: 0, contract: 0 });
  const [revenue, setRevenue] = useState({ total: 0, outstanding: 0 });
  const [recentContracts, setRecentContracts] = useState<any[]>([]);
  const [pendingFirms, setPendingFirms] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [rfpRes, firmRes, entityRes, contractRes, invRes, recentRes, pendingRes] = await Promise.all([
        supabase.from("rfps").select("*", { count: "exact", head: true }).in("status", ["open", "closing_soon"]),
        supabase.from("firms").select("*", { count: "exact", head: true }),
        supabase.from("entities").select("*", { count: "exact", head: true }),
        supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("invoices").select("amount_cents, status"),
        supabase.from("contracts").select("*, entity:entities(name, state), firm:firms(name)").order("created_at", { ascending: false }).limit(6),
        supabase.from("firms").select("id, name, state, created_at").eq("verified", false).order("created_at", { ascending: false }).limit(5),
      ]);
      setCounts({
        rfp: rfpRes.count ?? 0,
        firm: firmRes.count ?? 0,
        entity: entityRes.count ?? 0,
        contract: contractRes.count ?? 0,
      });
      const invoices = invRes.data ?? [];
      setRevenue({
        total: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount_cents), 0),
        outstanding: invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.amount_cents), 0),
      });
      setRecentContracts(recentRes.data ?? []);
      setPendingFirms(pendingRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  return (
    <div>
      <PageHeader title="Platform dashboard" subtitle="AuditDepot · All 50 states" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Open RFPs" value={counts.rfp} color="blue" />
          <StatCard label="Active contracts" value={counts.contract} color="green" />
          <StatCard label="Platform revenue" value={formatCurrency(revenue.total)} color="green" sub="5% fees collected" />
          <StatCard label="Outstanding invoices" value={formatCurrency(revenue.outstanding)} color={revenue.outstanding > 0 ? "amber" : "gray"} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Registered entities" value={counts.entity} color="purple" />
          <StatCard label="Audit firms" value={counts.firm} color="green" />
          <StatCard label="Pending verification" value={pendingFirms.length} color={pendingFirms.length ? "amber" : "gray"} />
          <StatCard label="States active" value="50" color="blue" sub="All US states" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm">Recent contracts</h2>
              <Link to="/dashboard/contracts" className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {recentContracts.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No contracts yet</p>}
              {recentContracts.map((c) => {
                const entity = Array.isArray(c.entity) ? c.entity[0] : c.entity;
                const firm = Array.isArray(c.firm) ? c.firm[0] : c.firm;
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="min-w-0">
                      <div className="text-sm truncate">{entity?.name} × {firm?.name}</div>
                      <div className="text-xs text-gray-400">{entity?.state} · {c.contract_term_years}yr · {formatDate(c.created_at)}</div>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <div className="text-sm font-medium text-green-700">{formatCurrency(c.platform_fee_cents)}</div>
                      <div className="text-xs text-gray-400">platform fee</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm">Firms awaiting verification</h2>
              <Link to="/dashboard/admin/firms" className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
            {!pendingFirms.length ? (
              <p className="text-sm text-gray-400 text-center py-6">No firms pending verification</p>
            ) : (
              <div className="space-y-2">
                {pendingFirms.map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium">{f.name}</div>
                      <div className="text-xs text-gray-400">{f.state} · {formatDate(f.created_at)}</div>
                    </div>
                    <Link to="/dashboard/admin/firms" className="btn-primary text-xs px-2 py-1">Verify</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
