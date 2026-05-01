import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/components/dashboard/DashboardLayout";
import { PageHeader, rfpStatusBadge } from "@/components/ui-kit";
import { formatDate } from "@/lib/utils";

interface Rfp {
  id: string;
  title: string;
  status: string;
  state: string;
  bid_deadline: string | null;
  created_at: string;
  budget_max: number | null;
  audit_type: string;
  bids: { id: string }[];
}

export default function MyRfps() {
  const { entity } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [rfps, setRfps] = useState<Rfp[]>([]);

  useEffect(() => {
    if (!entity) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("rfps")
        .select("id, title, status, state, bid_deadline, created_at, budget_max, audit_type, bids(id)")
        .eq("entity_id", entity.id)
        .order("created_at", { ascending: false });
      setRfps((data as any) ?? []);
      setLoading(false);
    })();
  }, [entity]);

  if (!entity) {
    return <div className="p-8 text-sm text-gray-500">Set up your organization to view RFPs.</div>;
  }

  return (
    <div>
      <PageHeader
        title="My RFPs"
        subtitle={`${rfps.length} total`}
        action={<Link to="/dashboard/rfps/new" className="btn-primary">+ Post RFP</Link>}
      />
      <div className="p-6">
        {loading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : rfps.length === 0 ? (
          <div className="card text-center py-12">
            <h2 className="font-medium mb-1 text-sm">No RFPs yet</h2>
            <p className="text-xs text-gray-500 mb-4">Post your first RFP to start receiving bids from audit firms.</p>
            <Link to="/dashboard/rfps/new" className="btn-primary text-xs">Post your first RFP</Link>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Bids</th>
                  <th className="text-left px-4 py-2.5 font-medium">Deadline</th>
                  <th className="text-left px-4 py-2.5 font-medium">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rfps.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/dashboard/rfps/${r.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                        {r.title}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5">{r.state} · {r.audit_type.replace(/_/g, " ")}</div>
                    </td>
                    <td className="px-4 py-3">{rfpStatusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-gray-600">{r.bids?.length ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(r.bid_deadline)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
