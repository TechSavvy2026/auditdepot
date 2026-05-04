import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboard } from "@/components/dashboard/DashboardLayout";
import { US_STATES, ENTITY_TYPE_LABELS, AUDIT_TYPE_LABELS } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { profile, role, entity, firm, refresh } = useDashboard();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // user
  const [fullName, setFullName] = useState(profile.full_name ?? "");

  // entity
  const [orgName, setOrgName] = useState("");
  const [entityType, setEntityType] = useState("local_government");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("12/31");

  // firm
  const [firmName, setFirmName] = useState("");
  const [firmContactName, setFirmContactName] = useState("");
  const [firmContactEmail, setFirmContactEmail] = useState("");
  const [firmState, setFirmState] = useState("");
  const [licenseNum, setLicenseNum] = useState("");
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [auditTypes, setAuditTypes] = useState<string[]>([]);
  const [entityTypesServed, setEntityTypesServed] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (role === "entity_user" && entity) {
        const { data } = await supabase.from("entities").select("*").eq("id", entity.id).maybeSingle();
        if (data) {
          setOrgName(data.name ?? "");
          setEntityType(data.entity_type ?? "local_government");
          setCity(data.city ?? "");
          setState(data.state ?? "");
          setContactEmail(data.contact_email ?? "");
          setFiscalYearEnd(data.fiscal_year_end ?? "12/31");
        }
      } else if (role === "firm_user" && firm) {
        const [{ data: f }, { data: lic }, { data: aud }, { data: ent }] = await Promise.all([
          supabase.from("firms").select("*").eq("id", firm.id).maybeSingle(),
          supabase.from("firm_licenses").select("*").eq("firm_id", firm.id).order("created_at", { ascending: true }),
          supabase.from("firm_audit_types").select("audit_type").eq("firm_id", firm.id),
          supabase.from("firm_entity_types").select("entity_type").eq("firm_id", firm.id),
        ]);
        if (f) {
          setFirmName(f.name ?? "");
          setFirmContactName(f.contact_name ?? "");
          setFirmContactEmail(f.contact_email ?? "");
          setFirmState(f.state ?? "");
        }
        const first = lic?.[0];
        if (first) { setLicenseId(first.id); setLicenseNum(first.license_num ?? ""); }
        setAuditTypes((aud ?? []).map((r: any) => r.audit_type));
        setEntityTypesServed((ent ?? []).map((r: any) => r.entity_type));
      }
      setLoading(false);
    })();
  }, [role, entity?.id, firm?.id]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // profile name
      if ((fullName ?? "") !== (profile.full_name ?? "")) {
        const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() || null }).eq("id", profile.id);
        if (error) throw error;
      }

      if (role === "entity_user" && entity) {
        const { error } = await supabase.from("entities").update({
          name: orgName,
          entity_type: entityType as any,
          city,
          state,
          contact_email: contactEmail || null,
          fiscal_year_end: fiscalYearEnd,
        }).eq("id", entity.id);
        if (error) throw error;
      } else if (role === "firm_user" && firm) {
        const { error: fe } = await supabase.from("firms").update({
          name: firmName,
          contact_name: firmContactName || null,
          contact_email: firmContactEmail || null,
          state: firmState || null,
        }).eq("id", firm.id);
        if (fe) throw fe;

        // license: upsert primary license
        if (licenseNum.trim()) {
          if (licenseId) {
            const { error } = await supabase.from("firm_licenses")
              .update({ license_num: licenseNum.trim(), state: firmState })
              .eq("id", licenseId);
            if (error) throw error;
          } else if (firmState) {
            const { data, error } = await supabase.from("firm_licenses")
              .insert({ firm_id: firm.id, license_num: licenseNum.trim(), state: firmState })
              .select().single();
            if (error) throw error;
            setLicenseId(data.id);
          }
        }

        // audit types: replace
        await supabase.from("firm_audit_types").delete().eq("firm_id", firm.id);
        if (auditTypes.length) {
          const { error } = await supabase.from("firm_audit_types")
            .insert(auditTypes.map((t) => ({ firm_id: firm.id, audit_type: t as any })));
          if (error) throw error;
        }

        // entity types: replace
        await supabase.from("firm_entity_types").delete().eq("firm_id", firm.id);
        if (entityTypesServed.length) {
          const { error } = await supabase.from("firm_entity_types")
            .insert(entityTypesServed.map((t) => ({ firm_id: firm.id, entity_type: t as any })));
          if (error) throw error;
        }
      }

      await refresh();
      toast({ title: "Profile saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Profile</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your account and organization details.</p>

      <form onSubmit={save} className="space-y-8">
        <section className="card space-y-4">
          <h2 className="font-medium">Your account</h2>
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50" type="email" value={profile.email} readOnly />
          </div>
          <div>
            <label className="label">Full name</label>
            <input className="input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        </section>

        {role === "entity_user" && entity && (
          <section className="card space-y-4">
            <h2 className="font-medium">Organization</h2>
            <div>
              <label className="label">Organization name</label>
              <input className="input" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Organization type</label>
              <select className="input" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">State</label>
                <select className="input" value={state} onChange={(e) => setState(e.target.value)} required>
                  <option value="">Select state</option>
                  {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" type="text" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Contact email</label>
              <input className="input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Fiscal year end</label>
              <select className="input" value={fiscalYearEnd} onChange={(e) => setFiscalYearEnd(e.target.value)}>
                <option value="12/31">December 31</option>
                <option value="06/30">June 30</option>
                <option value="09/30">September 30</option>
                <option value="03/31">March 31</option>
              </select>
            </div>
          </section>
        )}

        {role === "firm_user" && firm && (
          <section className="card space-y-4">
            <h2 className="font-medium">Firm</h2>
            <div>
              <label className="label">Firm name</label>
              <input className="input" type="text" value={firmName} onChange={(e) => setFirmName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Contact name</label>
                <input className="input" type="text" value={firmContactName} onChange={(e) => setFirmContactName(e.target.value)} />
              </div>
              <div>
                <label className="label">Contact email</label>
                <input className="input" type="email" value={firmContactEmail} onChange={(e) => setFirmContactEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Primary state</label>
                <select className="input" value={firmState} onChange={(e) => setFirmState(e.target.value)}>
                  <option value="">Select state</option>
                  {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">CPA license #</label>
                <input className="input" type="text" value={licenseNum} onChange={(e) => setLicenseNum(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Audit services offered</label>
              <div className="grid grid-cols-1 gap-1.5 mt-1">
                {Object.entries(AUDIT_TYPE_LABELS).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={auditTypes.includes(k)} onChange={() => toggle(auditTypes, setAuditTypes, k)} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Entity types served</label>
              <div className="grid grid-cols-1 gap-1.5 mt-1">
                {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={entityTypesServed.includes(k)} onChange={() => toggle(entityTypesServed, setEntityTypesServed, k)} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {role === "admin" && !entity && !firm && (
          <section className="card text-sm text-gray-500">
            Admin accounts have no organization profile.
          </section>
        )}

        <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
