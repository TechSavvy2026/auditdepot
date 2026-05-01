import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/components/dashboard/DashboardLayout";
import { PageHeader, contractStatusBadge } from "@/components/ui-kit";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Contracts() {
  const { role, entity, firm } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      let query = supabase
        .from("contracts")
        .select("*, rfp:rfps(id, title), entity:entities(id, name), firm:firms(id, name)")
        .order("created_at", { ascending: false });

      if (role === "entity_user" && entity) {
        query = query.eq("entity_id", entity.id);
      } else if (role === "firm_user" && firm) {
        query = query.eq("firm_id", firm.id);
      }

      const { data } = await query;
      setContracts(data ?? []);
      setLoading(false);
    })();
  }, [role, entity, firm]);

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  return (
    <div>
      <PageHeader title="Contracts" subtitle={`${contracts.length} contract${contracts.length !== 1 ? "s" : ""}`} />
      <div className="p-6 max-w-4xl">
        {contracts.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-sm text-gray-500">No contracts yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              {role === "entity_user"
                ? "Accept a bid on one of your RFPs to create a contract."
                : "Win a bid to receive a contract."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => {
              const rfp = Array.isArray(c.rfp) ? c.rfp[0] : c.rfp;
              const ent = Array.isArray(c.entity) ? c.entity[0] : c.entity;
              const f = Array.isArray(c.firm) ? c.firm[0] : c.firm;
              return (
                <Link
                  key={c.id}
                  to={`/dashboard/contracts/${c.id}`}
                  className="card block hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{rfp?.title ?? "Untitled RFP"}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {role === "entity_user" ? f?.name ?? "Firm" : ent?.name ?? "Entity"}
                        {" · "}
                        {formatCurrency(c.total_value_cents)} total
                        {" · "}
                        {c.contract_term_years} yr
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Created {formatDate(c.created_at)}</div>
                    </div>
                    {contractStatusBadge(c.status)}
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
