import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, rfpStatusBadge } from "@/components/ui-kit";
import { formatCurrency, formatDate, ENTITY_TYPE_LABELS } from "@/lib/utils";
import { useDashboard } from "./DashboardLayout";

export default function EntityDashboard() {
  const { entity } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [rfps, setRfps] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    if (!entity) { setLoading(false); return; }
    (async () => {
      const [rfpRes, conRes] = await Promise.all([
        supabase.from("rfps").select("*, bids(id)").eq("entity_id", entity.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("contracts").select("*, firm:firms(name)").eq("entity_id", entity.id)
          .in("status", ["active", "pending_govt_sig", "pending_firm_sig", "fully_executed"])
          .order("created_at", { ascending: false }).limit(3),
      ]);
      setRfps(rfpRes.data ?? []);
      setContracts(conRes.data ?? []);
      setLoading(false);
    })();
  }, [entity]);

  if (!entity) {
    return (
      <div className="p-6">
        <div className="card text-center py-12">
          <h2 className="font-medium mb-2">Complete your profile</h2>
          <p className="text-sm text-gray-500 mb-4">Add your organization details to start posting RFPs.</p>
          <Link to="/dashboard/profile" className="btn-primary">Set up profile →</Link>
        </div>
      </div>
    );
  }
  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  const openRfps = rfps.filter((r) => r.status === "open" || r.status === "closing_soon").length;
  const totalBids = rfps.reduce((s, r) => s + (r.bids?.length ?? 0), 0);
  const pendingSig = contracts.filter((c) => c.status === "pending_govt_sig").length;
  const activeContracts = contracts.filter((c) => c.status === "active").length;

  return (
    <div>
      <PageHeader
        title={entity.name}
        subtitle={`${ENTITY_TYPE_LABELS[entity.entity_type] ?? entity.entity_type} · ${entity.state}`}
        action={<Link to="/dashboard/rfps/new" className="btn-primary">+ Post RFP</Link>}
      />
      <div className="p-6 space-y-6">
        {pendingSig > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-amber-800 text-sm">Action required: Contract awaiting your signature</div>
              <div className="text-xs text-amber-700 mt-0.5">Review and sign to activate your audit engagement.</div>
            </div>
            <Link to="/dashboard/contracts" className="btn-primary text-xs px-3 py-1.5">Sign now →</Link>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Open RFPs" value={openRfps} color="blue" />
          <StatCard label="Bids received" value={totalBids} color="green" />
          <StatCard label="Active contracts" value={activeContracts} color="purple" />
          <StatCard label="Awaiting signature" value={pendingSig} color={pendingSig > 0 ? "amber" : "gray"} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm">My RFPs</h2>
              <Link to="/dashboard/rfps" className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
            {!rfps.length ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-3">No RFPs posted yet</p>
                <Link to="/dashboard/rfps/new" className="btn-primary text-xs">Post your first RFP</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {rfps.map((rfp) => (
                  <Link key={rfp.id} to={`/dashboard/rfps/${rfp.id}`} className="block border border-gray-100 rounded-lg p-3 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{rfp.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {rfp.bids?.length ?? 0} bid{rfp.bids?.length !== 1 ? "s" : ""} · Due {formatDate(rfp.bid_deadline)}
                        </div>
                      </div>
                      {rfpStatusBadge(rfp.status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm">Contracts</h2>
              <Link to="/dashboard/contracts" className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
            {!contracts.length ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No contracts yet.</p>
                <p className="text-xs text-gray-400 mt-1">Post an RFP and award a bid to generate a contract.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contracts.map((contract) => {
                  const firm = Array.isArray(contract.firm) ? contract.firm[0] : contract.firm;
                  return (
                    <Link key={contract.id} to={`/dashboard/contracts/${contract.id}`} className="block border border-gray-100 rounded-lg p-3 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{firm?.name ?? "Audit firm"}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatCurrency(contract.annual_fee_cents)}/yr · {contract.contract_term_years} yr · {formatCurrency(contract.total_value_cents)} total
                          </div>
                        </div>
                        <div className="text-xs text-green-700 font-medium whitespace-nowrap">
                          {formatCurrency(contract.platform_fee_cents)} fee
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-1">Audit compliance reminder</h3>
          <p className="text-xs text-blue-700 leading-relaxed">
            Organizations receiving over $750,000 in federal expenditures annually must complete a Single Audit under 2 CFR Part 200.
            Failure to file can result in loss of grant eligibility.
          </p>
        </div>
      </div>
    </div>
  );
}
