import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "amber" | "red" | "purple" | "gray";
}
const colorMap = {
  blue: "text-brand-600", green: "text-green-700", amber: "text-amber-600",
  red: "text-red-600", purple: "text-purple-700", gray: "text-gray-400",
};

export function StatCard({ label, value, sub, color = "blue" }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={cn("text-2xl font-semibold mb-0.5", colorMap[color])}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

interface PageHeaderProps { title: string; subtitle?: string; action?: ReactNode }
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div>
        <h1 className="text-base font-semibold">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

type Variant = "blue" | "green" | "amber" | "red" | "purple" | "gray";
const badgeColors: Record<Variant, string> = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  purple: "bg-purple-50 text-purple-700",
  gray: "bg-gray-100 text-gray-600",
};

export function StatusBadge({ children, variant = "gray" }: { children: ReactNode; variant?: Variant }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", badgeColors[variant])}>
      {children}
    </span>
  );
}

export function rfpStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    draft: { label: "Draft", variant: "gray" },
    open: { label: "Open", variant: "blue" },
    closing_soon: { label: "Closing soon", variant: "amber" },
    under_review: { label: "Under review", variant: "purple" },
    awarded: { label: "Awarded", variant: "green" },
    cancelled: { label: "Cancelled", variant: "red" },
  };
  const cfg = map[status] ?? { label: status, variant: "gray" as Variant };
  return <StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge>;
}

export function contractStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    draft: { label: "Draft", variant: "gray" },
    pending_govt_sig: { label: "Awaiting client", variant: "amber" },
    pending_firm_sig: { label: "Awaiting auditor", variant: "amber" },
    fully_executed: { label: "Executed", variant: "green" },
    active: { label: "Active", variant: "blue" },
    expired: { label: "Expired", variant: "gray" },
    terminated: { label: "Terminated", variant: "red" },
  };
  const cfg = map[status] ?? { label: status, variant: "gray" as Variant };
  return <StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge>;
}

export function invoiceStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: Variant }> = {
    draft: { label: "Draft", variant: "gray" },
    sent: { label: "Sent", variant: "blue" },
    paid: { label: "Paid", variant: "green" },
    overdue: { label: "Overdue", variant: "red" },
    void: { label: "Void", variant: "gray" },
  };
  const cfg = map[status] ?? { label: status, variant: "gray" as Variant };
  return <StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge>;
}
