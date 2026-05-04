import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { US_STATES, ENTITY_TYPE_LABELS, AUDIT_TYPE_LABELS } from "@/lib/utils";

type Role = "entity" | "firm";

export default function SignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const defaultRole: Role = params.get("role") === "firm" ? "firm" : "entity";

  const [role, setRole] = useState<Role>(defaultRole);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // step 2 — entity
  const [orgName, setOrgName] = useState("");
  const [entityType, setEntityType] = useState("local_government");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("12/31");

  // step 2 — firm
  const [firmName, setFirmName] = useState("");
  const [firmState, setFirmState] = useState("");
  const [licenseNum, setLicenseNum] = useState("");
  const [firmEmail, setFirmEmail] = useState("");
  const [selectedAuditTypes, setSelectedAuditTypes] = useState<string[]>([]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  // If already logged in, send to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: role === "firm" ? "firm_user" : "entity_user" },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (signUpError) {
      // If the auth user already exists, try to sign them in to resume setup
      const msg = (signUpError.message || "").toLowerCase();
      const alreadyExists =
        msg.includes("already registered") ||
        msg.includes("user already") ||
        (signUpError as any).code === "user_already_exists";

      if (alreadyExists) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError || !signInData.session) {
          setError(
            "An account with this email already exists. If this is you, please sign in with your existing password — or reset it from the login page."
          );
          setLoading(false);
          return;
        }
        // Logged in. Check if org/entity already exists; if so, go straight to dashboard.
        const userId = signInData.session.user.id;
        const [{ data: existingEntity }, { data: existingFirm }] = await Promise.all([
          supabase.from("entities").select("id").eq("owner_id", userId).maybeSingle(),
          supabase.from("firms").select("id").eq("owner_id", userId).maybeSingle(),
        ]);
        if (existingEntity || existingFirm) {
          navigate("/dashboard");
          return;
        }
        // Otherwise let them complete step 2
        setStep(2);
        setLoading(false);
        return;
      }

      setError(signUpError.message);
      setLoading(false);
      return;
    }
    setStep(2);
    setLoading(false);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (role === "entity") {
        const { error } = await supabase.from("entities").insert({
          owner_id: user.id,
          name: orgName,
          entity_type: entityType as any,
          state, city,
          contact_email: contactEmail || email,
          fiscal_year_end: fiscalYearEnd,
        });
        if (error) throw error;
      } else {
        const { data: firm, error: firmErr } = await supabase
          .from("firms")
          .insert({
            owner_id: user.id,
            name: firmName,
            state: firmState,
            contact_email: firmEmail || email,
            contact_name: fullName,
          })
          .select()
          .single();
        if (firmErr) throw firmErr;
        if (firmState && licenseNum) {
          await supabase.from("firm_licenses").insert({
            firm_id: firm.id, state: firmState, license_num: licenseNum,
          });
        }
        if (selectedAuditTypes.length > 0) {
          const { error: atErr } = await supabase
            .from("firm_audit_types")
            .insert(selectedAuditTypes.map((t) => ({ firm_id: firm.id, audit_type: t as any })));
          if (atErr) throw atErr;
        }
        if (selectedEntityTypes.length > 0) {
          const { error: etErr } = await supabase
            .from("firm_entity_types")
            .insert(selectedEntityTypes.map((t) => ({ firm_id: firm.id, entity_type: t as any })));
          if (etErr) throw etErr;
        }
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-brand-600 font-semibold text-xl">AuditDepot</Link>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>
        <div className="flex mb-6 gap-2">
          {["Account", "Organization"].map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full ${i < step ? "bg-brand-600" : "bg-gray-200"}`} />
              <div className={`text-xs mt-1 ${i + 1 === step ? "text-brand-600 font-medium" : "text-gray-400"}`}>{s}</div>
            </div>
          ))}
        </div>
        <div className="card">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="label">I am registering as</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["entity", "firm"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        role === r
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {r === "entity" ? "🏛️ Govt / Nonprofit / School" : "⚖️ Audit firm (CPA)"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Full name</label>
                <input className="input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required />
              </div>
              <div>
                <label className="label">Email address</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.org" required />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" minLength={8} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
                {loading ? "Creating account…" : "Continue →"}
              </button>
            </form>
          )}

          {step === 2 && role === "entity" && (
            <form onSubmit={handleStep2} className="space-y-4">
              <h3 className="font-medium">Tell us about your organization</h3>
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
                {loading ? "Setting up…" : "Create account →"}
              </button>
            </form>
          )}

          {step === 2 && role === "firm" && (
            <form onSubmit={handleStep2} className="space-y-4">
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
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Platform fee:</strong> When you win a contract, a 5% fee on the total contract value is invoiced to your firm. Entities pay nothing extra.
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
                {loading ? "Setting up…" : "Create firm account →"}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
