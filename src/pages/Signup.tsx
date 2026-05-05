import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Role = "entity" | "firm";

export default function SignupPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("entity");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role === "firm" ? "firm_user" : "entity_user",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    if (user) {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email,
          full_name: fullName,
        },
        { onConflict: "id" }
      );

      await supabase.from("user_roles").insert({
        user_id: user.id,
        role: role === "firm" ? "firm_user" : "entity_user",
      });
    }

    navigate("/auth/complete-setup");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-brand-600 font-semibold text-xl">
            AuditDepot
          </Link>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="label">I am registering as</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setRole("entity")}
                  className={`border rounded-lg px-3 py-4 font-medium ${
                    role === "entity"
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  🏛️ Govt / Nonprofit / School
                </button>

                <button
                  type="button"
                  onClick={() => setRole("firm")}
                  className={`border rounded-lg px-3 py-4 font-medium ${
                    role === "firm"
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  ⚖️ Audit firm (CPA)
                </button>
              </div>
            </div>

            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Continue →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
