import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Role = "admin" | "entity_user" | "firm_user";

interface Props {
  profile: { id: string; email: string; full_name: string | null };
  role: Role;
  entity?: { id: string; name: string; entity_type: string; state: string } | null;
  firm?: { id: string; name: string; state: string | null; verified: boolean; suspended: boolean } | null;
  availableRoles?: Role[];
  onSwitchRole?: (r: Role) => void;
}

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  entity_user: "Entity",
  firm_user: "Audit firm",
};

const adminLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/admin/firms", label: "Audit firms" },
  { href: "/dashboard/contracts", label: "Contracts" },
  { href: "/dashboard/admin/billing", label: "Billing" },
];
const entityLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/rfps/new", label: "Post RFP" },
  { href: "/dashboard/rfps", label: "My RFPs" },
  { href: "/dashboard/contracts", label: "Contracts" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/profile", label: "Profile" },
];
const firmLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/browse", label: "Browse RFPs" },
  { href: "/dashboard/bids", label: "My bids" },
  { href: "/dashboard/contracts", label: "Contracts" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/firm-profile", label: "Firm profile" },
];

export default function DashboardSidebar({ profile, role, entity, firm, availableRoles, onSwitchRole }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const links = role === "admin" ? adminLinks : role === "firm_user" ? firmLinks : entityLinks;
  const orgName = role === "firm_user" ? firm?.name : role === "entity_user" ? entity?.name : "Admin";
  const showSwitcher = (availableRoles?.length ?? 0) > 1;

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/auth/login");
  }

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-100">
        <Link to="/" className="text-brand-600 font-semibold text-base">AuditDepot</Link>
        <div className="text-xs text-gray-400 mt-0.5">National RFP Marketplace</div>
      </div>
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-xs text-gray-400 mb-0.5">
          {role === "firm_user" ? "Audit firm" : role === "admin" ? "Administrator" : "Organization"}
        </div>
        <div className="text-sm font-medium truncate">{orgName ?? "—"}</div>
        {firm?.suspended && <div className="mt-1 text-xs text-red-600 font-medium">⚠ Account suspended</div>}
        {firm && !firm.verified && <div className="mt-1 text-xs text-amber-600">Pending verification</div>}
      </div>
      {showSwitcher && (
        <div className="px-4 py-3 border-b border-gray-100">
          <label className="block text-xs text-gray-400 mb-1">View as</label>
          <select
            value={role}
            onChange={(e) => onSwitchRole?.(e.target.value as Role)}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {availableRoles!.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>
      )}
      <nav className="flex-1 py-2 overflow-y-auto">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                active ? "bg-brand-50 text-brand-600 font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="text-xs text-gray-500 truncate mb-1">{profile.email}</div>
        <button onClick={signOut} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Sign out
        </button>
      </div>
    </aside>
  );
}
