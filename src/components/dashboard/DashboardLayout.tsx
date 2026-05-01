import { useEffect, useState, createContext, useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "./Sidebar";

type Role = "admin" | "entity_user" | "firm_user";

const ACTIVE_ROLE_KEY = "ad:activeRole";

export interface DashboardContext {
  profile: { id: string; email: string; full_name: string | null };
  role: Role;
  availableRoles: Role[];
  setActiveRole: (r: Role) => void;
  entity: { id: string; name: string; entity_type: string; state: string } | null;
  firm: {
    id: string; name: string; state: string | null;
    verified: boolean; suspended: boolean;
  } | null;
  refresh: () => Promise<void>;
}

const Ctx = createContext<DashboardContext | null>(null);

export function useDashboard(): DashboardContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDashboard outside layout");
  return v;
}

export default function DashboardLayout() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [data, setData] = useState<{
    profile: DashboardContext["profile"];
    availableRoles: Role[];
    role: Role;
    entity: DashboardContext["entity"];
    firm: DashboardContext["firm"];
  } | null>(null);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setAuthed(false); setLoading(false); return; }
    setAuthed(true);

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").eq("id", session.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", session.user.id),
    ]);

    if (!profile) { setAuthed(false); setLoading(false); return; }

    const roleList = Array.from(new Set((roles ?? []).map((r) => r.role as Role)));

    // Default priority: entity_user > firm_user > admin (so admin is opt-in when multi-role)
    const defaultRole: Role = roleList.includes("entity_user")
      ? "entity_user"
      : roleList.includes("firm_user")
      ? "firm_user"
      : "admin";

    const stored = (typeof window !== "undefined" ? localStorage.getItem(ACTIVE_ROLE_KEY) : null) as Role | null;
    const role: Role = stored && roleList.includes(stored) ? stored : defaultRole;

    // Load entity/firm whenever the user owns one (admins might also own one).
    const [{ data: entity }, { data: firm }] = await Promise.all([
      supabase.from("entities").select("id, name, entity_type, state").eq("owner_id", session.user.id).maybeSingle(),
      supabase.from("firms").select("id, name, state, verified, suspended").eq("owner_id", session.user.id).maybeSingle(),
    ]);

    setData({ profile, availableRoles: roleList, role, entity: entity ?? null, firm: firm ?? null });
    setLoading(false);
  }

  function setActiveRole(r: Role) {
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_ROLE_KEY, r);
    setData((d) => (d ? { ...d, role: r } : d));
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setAuthed(false); }
    });
    load();
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }
  if (!authed || !data) return <Navigate to="/auth/login" replace />;

  // Only force complete-setup if the active role needs an org and none exists.
  if (data.role === "entity_user" && !data.entity) {
    if (!data.availableRoles.some((r) => r !== "entity_user")) {
      return <Navigate to="/auth/complete-setup" replace />;
    }
  }
  if (data.role === "firm_user" && !data.firm) {
    if (!data.availableRoles.some((r) => r !== "firm_user")) {
      return <Navigate to="/auth/complete-setup" replace />;
    }
  }

  const ctx: DashboardContext = { ...data, refresh: load, setActiveRole };
  return (
    <Ctx.Provider value={ctx}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <DashboardSidebar
          profile={data.profile}
          role={data.role}
          entity={data.entity}
          firm={data.firm}
          availableRoles={data.availableRoles}
          onSwitchRole={setActiveRole}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
