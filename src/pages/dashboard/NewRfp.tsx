import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/ui-kit";
import { toast } from "@/hooks/use-toast";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const AUDIT_TYPES = [
  { value: "financial_statement", label: "Financial statement" },
  { value: "single_audit", label: "Single Audit" },
  { value: "yellow_book", label: "Yellow Book" },
  { value: "agreed_upon_procedures", label: "Agreed-upon procedures" },
  { value: "performance", label: "Performance" },
  { value: "forensic", label: "Forensic" },
] as const;

const schema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().max(5000).optional(),
  budget: z.string().trim().optional(),
  bid_deadline: z.string().min(1, "Deadline is required"),
  state: z.string().length(2, "Select a state"),
  city: z.string().trim().min(1, "City is required").max(100),
  audit_type: z.enum([
    "financial_statement","single_audit","yellow_book","agreed_upon_procedures","performance","forensic",
  ]),
});

export default function NewRfp() {
  const { entity } = useDashboard();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    budget: "",
    bid_deadline: "",
    state: entity?.state ?? "",
    city: "",
    audit_type: "financial_statement" as (typeof AUDIT_TYPES)[number]["value"],
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  if (!entity) {
    return (
      <div className="p-8 text-sm text-gray-500">
        You need an organization profile before posting an RFP.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    const data = parsed.data;

    let budget_max: number | null = null;
    if (data.budget) {
      const n = Number(data.budget.replace(/[^\d.]/g, ""));
      if (!Number.isFinite(n) || n < 0) {
        setErrors({ budget: "Budget must be a positive number" });
        return;
      }
      budget_max = Math.round(n * 100); // store cents
    }

    setSubmitting(true);
    const description = `City: ${data.city}\n\n${data.description ?? ""}`.trim();
    const { data: inserted, error } = await supabase
      .from("rfps")
      .insert({
        entity_id: entity!.id,
        title: data.title,
        description,
        budget_max,
        bid_deadline: new Date(data.bid_deadline).toISOString(),
        state: data.state,
        audit_type: data.audit_type,
        status: "open",
      })
      .select("id")
      .single();
    setSubmitting(false);

    if (error) {
      toast({ title: "Could not post RFP", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "RFP posted", description: "Audit firms can now submit bids." });
    navigate("/dashboard/rfps", { state: { newRfpId: inserted?.id } });
  }

  const minDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Post a new RFP" subtitle={`${entity.name} · ${entity.state}`} />
      <div className="p-6 max-w-2xl">
        <form onSubmit={onSubmit} className="card space-y-5">
          <Field label="Title" error={errors.title} required>
            <input
              className="input"
              placeholder="FY2025 Financial Statement Audit"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              maxLength={200}
            />
          </Field>

          <Field label="Audit type" error={errors.audit_type} required>
            <select
              className="input"
              value={form.audit_type}
              onChange={(e) => update("audit_type", e.target.value as typeof form.audit_type)}
            >
              {AUDIT_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </Field>

          <Field label="Description" error={errors.description}>
            <textarea
              className="input min-h-[120px]"
              placeholder="Scope, deliverables, key expectations…"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={5000}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget (USD)" error={errors.budget} hint="Optional. Maximum you can spend.">
              <input
                className="input"
                inputMode="decimal"
                placeholder="50000"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
              />
            </Field>
            <Field label="Bid deadline" error={errors.bid_deadline} required>
              <input
                type="date"
                className="input"
                min={minDate}
                value={form.bid_deadline}
                onChange={(e) => update("bid_deadline", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="State" error={errors.state} required>
              <select
                className="input"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              >
                <option value="">Select…</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="City" error={errors.city} required>
              <input
                className="input"
                placeholder="Springfield"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                maxLength={100}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-900"
              onClick={() => navigate("/dashboard/rfps")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Posting…" : "Post RFP"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, error, hint, required, children,
}: { label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      {children}
      {hint && !error && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </label>
  );
}
