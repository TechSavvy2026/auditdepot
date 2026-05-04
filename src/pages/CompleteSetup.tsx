import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { US_STATES, ENTITY_TYPE_LABELS, AUDIT_TYPE_LABELS } from "@/lib/utils";

type Role = "entity" | "firm";

// Small retry helper for transient backend hiccups (EOF / schema cache)
async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 600): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = (err?.message || "").toLowerCase();
      const transient =
        msg.includes("unexpected eof") ||
        msg.includes("schema cache") ||
        msg.includes("fetch") ||
        msg.includes("network") ||
        err?.status === 500 ||
        err?.status === 503;
      if (!transient || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

export default function CompleteSetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState<Role>("entity");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // entity
  const [orgName, setOrgName] = useState("");
  const [entityType, setEntityType] = useState("local_government");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("12/31");

  // firm
  const [firmName, setFirmName] = useState("");
  const [firmState, setFirmState] = useState("");
  const [licenseNum, setLicenseNum] = useState("");
  const [firmEmail, setFirmEmail] = useState("");
  const [firmContactName, setFirmContactName] = useState("");
  const [selectedAuditTypes, setSelectedAuditTypes] = useState<string[]>([]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Make sure we have a session — retry briefly in case auth API is warming up
        const session = await withRetry(async () => {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!data.session) throw new Error("no session");
          return data.session;
        }, 3, 500).catch(() => null);

        if (!session) {
          if (!cancelled) navigate("/auth/login");
          return;
        }
        if (cancelled) return;
        setEmail(session.user.email ?? "");
        setUserId(session.user.id);

        // 2) Pull profile + roles + existing org records (with retries)
        const result = await withRetry(async () => {
          const [profileRes, rolesRes, entityRes, firmRes] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", session.user.id),
            supabase.from("entities").select("id").eq("owner_id", session.user.id).maybeSingle(),
            supabase.from("firms").select("id").eq("owner_id", session.user.id).maybeSingle(),
          ]);
          const firstErr =
            profileRes.error || rolesRes.error || entityRes.error || firmRes.error;
          if (firstErr) throw firstErr;
          return {
            profile: profileRes.data,
            roles: rolesRes.data ?? [],
            entity: entityRes.data,
            firm: firmRes.data,
          };
        });

        if (cancelled) return;

        if (result.entity || result.firm) {
          navigate("/dashboard");
          return;
        }

        setFullName(result.profile?.full_name ?? "");
        const userRole = result.roles.find((r: any) => r.role === "firm_user") ? "firm" : "entity";
        setRole(userRole);
        setChecking(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.message
            ? `Couldn't load your account: ${err.message}. Please refresh and try again.`
            : "Couldn't load your account. Please refresh and try again."
        );
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Re-confirm session right before write — token may have refreshed
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const user = sessionData.session?.user;
      if (!user) throw new Error("Your session expired. Please sign in again.");

      // Always sync profile full_name from this form (trigger only seeds it from signup metadata)
      if (fullName.trim()) {
        await withRetry(async () => {
          const { error } = await supabase
            .from("profiles")
            .update({ full_name: fullName.trim() })
            .eq("id", user.id);
          if (error) throw error;
        });
      }

      if (role === "entity") {
        await withRetry(async () => {
          const { error } = await supabase.from("entities").insert({
            owner_id: user.id,
            name: orgName,
            entity_type: entityType as any,
            state,
            city,
            contact_email: contactEmail || email,
            fiscal_year_end: fiscalYearEnd,
          });
          if (error) throw error;
        });
      } else {
        const contactNameForFirm = (firmContactName || fullName).trim();
        const firm = await withRetry(async () => {
          const { data, error } = await supabase
            .from("firms")
            .insert({
              owner_id: user.id,
              name: firmName,
              state: firmState,
              contact_email: firmEmail || email,
              contact_name: contactNameForFirm,
            })
            .select()
            .single();
          if (error) throw error;
          return data;
        });
        if (firmState && licenseNum) {
          await withRetry(async () => {
            const { error } = await supabase.from("firm_licenses").insert({
              firm_id: firm.id,
              state: firmState,
              license_num: licenseNum,
            });
            if (error) throw error;
          });
        }
        if (selectedAuditTypes.length > 0) {
          await withRetry(async () => {
            const { error } = await supabase
              .from("firm_audit_types")
              .insert(selectedAuditTypes.map((t) => ({ firm_id: firm.id, audit_type: t as any })));
            if (error) throw error;
          });
        }
        if (selectedEntityTypes.length > 0) {
          await withRetry(async () => {
            const { error } = await supabase
              .from("firm_entity_types")
              .insert(selectedEntityTypes.map((t) => ({ firm_id: firm.id, entity_type: t as any })));
            if (error) throw error;
          });
        }
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading your account…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-brand-600 font-semibold text-xl">AuditDepot</Link>
          <p className="text-gray-500 text-sm mt-1">Finish setting up your account</p>
        </div>
        <div className="card">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-3 py-2 rounded-lg mb-4">
            Your account exists but your {role === "entity" ? "organization" : "firm"} profile isn't set up yet. Complete the details below to access your dashboard.
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>}

          {role === "entity" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-medium">Tell us about your organization</h3>
              <div>
                <label className="label">Your full name</label>
                <input className="input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required />
              </div>
              <div>
                <label className="label">Organization name</label>
                <input className="input" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="City of Atlanta" required />
              </div>
              <div>
                <label className="label">Organization type</label>
                <select className="input" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
                  {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
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
                  <input className="input" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Atlanta" />
                </div>
              </div>
              <div>
                <label className="label">Finance contact email</label>
                <input className="input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="finance@yourorg.gov" />
              </div>
              <div>
                <label className="label">Fiscal year end</label>
                <select className="input" value={fiscalYearEnd} onChange={(e) => setFiscalYearEnd(e.target.value)}>
                  <option value="12/31">December 31</option>
                  <option value="06/30">June 30</option>
                  <option value="09/30">September 30</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
                {loading ? "Setting up…" : "Complete setup →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-medium">Tell us about your firm</h3>
              <div>
                <label className="label">CPA firm name</label>
                <input className="input" type="text" value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Smith & Associates, CPA" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Primary state</label>
                  <select className="input" value={firmState} onChange={(e) => setFirmState(e.target.value)} required>
                    <option value="">Select state</option>
                    {US_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">State CPA license #</label>
                  <input className="input" type="text" value={licenseNum} onChange={(e) => setLicenseNum(e.target.value)} placeholder="PA-001234" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Your full name</label>
                  <input className="input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required />
                </div>
                <div>
                  <label className="label">Firm contact name</label>
                  <input className="input" type="text" value={firmContactName} onChange={(e) => setFirmContactName(e.target.value)} placeholder="(defaults to your name)" />
                </div>
              </div>
              <div>
                <label className="label">Firm contact email</label>
                <input className="input" type="email" value={firmEmail} onChange={(e) => setFirmEmail(e.target.value)} placeholder="contact@yourfirm.com" />
              </div>
              <div>
                <label className="label">Audit services offered</label>
                <div className="grid grid-cols-1 gap-1.5 mt-1">
                  {Object.entries(AUDIT_TYPE_LABELS).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedAuditTypes.includes(k)}
                        onChange={() => toggle(selectedAuditTypes, setSelectedAuditTypes, k)}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Entity types you serve</label>
                <div className="grid grid-cols-1 gap-1.5 mt-1">
                  {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedEntityTypes.includes(k)}
                        onChange={() => toggle(selectedEntityTypes, setSelectedEntityTypes, k)}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
                {loading ? "Setting up…" : "Complete setup →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
