import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { formatCurrency } from "@/lib/utils";
import { useDashboard } from "./DashboardLayout";

export default function FirmDashboard() {
  const { firm } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [matchingRfps, setMatchingRfps] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    if (!firm) { setLoading(false); return; }
    (async () => {
      const { data: lic } = await supabase.from("firm_licenses").select("*").eq("firm_id", firm.id);
      const licensedStates = (lic ?? []).map((l) => l.state);
      const [bidRes, rfpRes, invRes, conRes] = await Promise.all([
        supabase.from("bids").select("*, rfp:rfps(id, title, status, state, bid_deadline, contract_term_years, entity:entities(name))")
          .eq("firm_id", firm.id).order("submitted_at", { ascending: false }).limit(5),
        supabase.from("rfps").select("*, entity:entities(name, entity_type), bids(id)")
          .in("state", licensedStates.length ? licensedStates : ["__none__"])
          .in("status", ["open", "closing_soon"])
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("invoices").select("*").eq("firm_id", firm.id),
        supabase.from("contracts").select("id, status").eq("firm_id", firm.id),
      ]);
      setLicenses(lic ?? []);
      setBids(bidRes.data ?? []);
      setMatchingRfps(rfpRes.data ?? []);
      setInvoices(invRes.data ?? []);
      setContracts(conRes.data ?? []);
      setLoading(false);
    })();
  }, [firm]);

  if (!firm) {
    return (
      <div className="p-6">
        <div className="card text-center py-12">
          <h2 className="font-medium mb-2">Set up your firm profile</h2>
          <p className="text-sm text-gray-500 mb-4">Add your firm details and state licenses to start bidding.</p>
          <Link to="/dashboard/firm-profile" className="btn-primary">Set up profile →</Link>
        </div>
      </div>
    );
  }
  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  const licensedStates = licenses.map((l) => l.state);
  const activeBids = bids.filter((b) => ["submitted", "under_review", "shortlisted"].includes(b.status)).length;
  const outstandingInvoicesList = invoices.filter((i) => i.status !== "paid");
  const paidInvoicesList = invoices.filter((i) => i.status === "paid");
  const totalFeesDue = outstandingInvoicesList.reduce((s, i) => s + Number(i.amount_cents), 0);
  const totalPaidRevenue = paidInvoicesList.reduce((s, i) => s + Number(i.amount_cents), 0);
  const activeContracts = contracts.filter((c) => c.status === "active").length;
  const awaitingSig = contracts.filter((c) => ["pending_signature", "pending_firm_sig", "pending_govt_sig"].includes(c.status)).length;

  return (
    <div>
      <PageHeader
        title={firm.name}
        subtitle={`Licensed in ${licensedStates.length} state${licensedStates.length !== 1 ? "s" : ""}${firm.suspended ? " · ⚠ Account suspended" : ""}`}
        action={<Link to="/dashboard/browse" className="btn-primary">Browse RFPs</Link>}
      />
      <div className="p-6 space-y-6">
        {firm.suspended && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-red-800 text-sm">Bidding suspended — overdue invoice</div>
              <div className="text-xs text-red-700 mt-0.5">Pay your outstanding platform fee invoice to restore bid access.</div>
            </div>
            <Link to="/dashboard/invoices" className="btn-primary text-xs px-3 py-1.5 bg-red-600 border-red-600 hover:bg-red-700">Pay now →</Link>
          </div>
        )}
        {!firm.verified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="font-medium text-amber-800 text-sm">Verification in progress</div>
            <div className="text-xs text-amber-700 mt-0.5">Your firm is pending license verification. Verified firms can bid on RFPs.</div>
          </div>
        )}
        {outstandingInvoicesList.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-amber-800 text-sm">Outstanding invoice — {formatCurrency(totalFeesDue)} due</div>
              <div className="text-xs text-amber-700 mt-0.5">Platform fee for recent contract</div>
            </div>
            <Link to="/dashboard/invoices" className="btn-primary text-xs px-3 py-1.5">View invoices →</Link>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Active bids" value={activeBids} color="blue" />
          <StatCard label="Active contracts" value={activeContracts} color="purple" />
          <StatCard label="Matching open RFPs" value={matchingRfps.length} color="green" />
          <StatCard label="Outstanding invoices" value={outstandingInvoicesList.length} color={outstandingInvoicesList.length ? "amber" : "gray"} />
          <StatCard label="Paid invoices" value={paidInvoicesList.length} color="green" />
          <StatCard label="Total paid revenue" value={formatCurrency(totalPaidRevenue)} color="purple" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm">Open RFPs in your licensed states</h2>
              <Link to="/dashboard/browse" className="text-xs text-brand-600 hover:underline">Browse all</Link>
            </div>
            {!matchingRfps.length ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No matching RFPs right now.</p>
                <Link to="/dashboard/firm-profile" className="text-xs text-brand-600 hover:underline mt-2 inline-block">Add licenses →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {matchingRfps.map((rfp) => {
                  const ent = Array.isArray(rfp.entity) ? rfp.entity[0] : rfp.entity;
                  return (
                    <Link key={rfp.id} to={`/dashboard/browse/${rfp.id}`} className="block border border-gray-100 rounded-lg p-3 hover:border-brand-300 hover:bg-brand-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{rfp.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {ent?.name} · {rfp.state} · {rfp.bids?.length ?? 0} bid{rfp.bids?.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <span className="btn-primary text-xs px-2 py-1 whitespace-nowrap flex-shrink-0">Bid</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm">My recent bids</h2>
              <Link to="/dashboard/bids" className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
            {!bids.length ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-3">No bids submitted yet</p>
                <Link to="/dashboard/browse" className="btn-primary text-xs">Find RFPs to bid on</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {bids.map((bid) => {
                  const rfp = Array.isArray(bid.rfp) ? bid.rfp[0] : bid.rfp;
                  const ent = Array.isArray(rfp?.entity) ? rfp.entity[0] : rfp?.entity;
                  return (
                    <div key={bid.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{ent?.name ?? rfp?.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Bid: {formatCurrency(bid.annual_fee)}/yr</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {bid.status === "awarded" ? <span className="text-green-600 font-medium">Won ✓</span>
                            : bid.status === "rejected" ? <span className="text-red-500">Not selected</span>
                            : <span className="text-amber-600">Under review</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600">
          <strong>Platform fee:</strong> When you win a contract, AuditDepot invoices 5% of the total multi-year contract value at signing. The entity's pricing is never affected.
        </div>
      </div>
    </div>
  );
}
