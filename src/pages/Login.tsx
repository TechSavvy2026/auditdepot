import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [mode, setMode] = useState<"password" | "magic">("password");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (mode === "password") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const code = (error as any).code;
        if (code === "invalid_credentials" || /invalid login/i.test(error.message)) {
          setError("Incorrect email or password. Please try again, or use the magic link option if you forgot your password.");
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }
      // Check if profile setup is complete (entity or firm record exists)
      const userId = data.session!.user.id;
      const [{ data: entity }, { data: firm }, { data: roles }] = await Promise.all([
        supabase.from("entities").select("id").eq("owner_id", userId).maybeSingle(),
        supabase.from("firms").select("id").eq("owner_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!isAdmin && !entity && !firm) {
        navigate("/auth/complete-setup");
        return;
      }
      navigate("/dashboard");
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setMagicSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-brand-600 font-semibold text-xl">AuditDepot</Link>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>
        <div className="card">
          {magicSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">Check your email</h3>
              <p className="text-sm text-gray-500">
                We sent a sign-in link to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
              <div>
                <label className="label">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required />
              </div>
              {mode === "password" && (
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="label">Password</label>
                    <button type="button" onClick={() => setMode("magic")} className="text-xs text-brand-600 hover:underline">
                      Use magic link instead
                    </button>
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" required />
                </div>
              )}
              {mode === "magic" && (
                <p className="text-sm text-gray-500">
                  We'll email you a secure sign-in link — no password needed.{" "}
                  <button type="button" onClick={() => setMode("password")} className="text-brand-600 hover:underline">
                    Use password instead
                  </button>
                </p>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60">
                {loading ? "Signing in…" : mode === "magic" ? "Send magic link" : "Sign in"}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account? <Link to="/auth/signup" className="text-brand-600 hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
