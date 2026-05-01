import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PLATFORM_FEE_PCT = 5;

export const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  local_government: "Local Government",
  nonprofit: "Nonprofit / 501(c)(3)",
  school_district: "School District",
  charter_school: "Charter School",
  community_college: "Community College",
  housing_authority: "Housing Authority",
  transit_authority: "Transit Authority",
  other: "Other",
};

export const AUDIT_TYPE_LABELS: Record<string, string> = {
  yellow_book: "GAGAS / Yellow Book",
  single_audit: "Single Audit (2 CFR 200)",
  financial_statement: "Financial Statement Audit",
  agreed_upon_procedures: "Agreed-Upon Procedures",
  performance: "Performance Audit",
  forensic: "Forensic / Investigative Audit",
};

export const RFP_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", open: "Open", closing_soon: "Closing Soon",
  under_review: "Under Review", awarded: "Awarded", cancelled: "Cancelled",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", pending_signature: "Awaiting Signature",
  pending_govt_sig: "Awaiting Client Signature",
  pending_firm_sig: "Awaiting Auditor Signature", fully_executed: "Fully Executed",
  active: "Active", completed: "Completed", expired: "Expired", terminated: "Terminated",
};

export function formatCurrency(cents: number | null | undefined): string {
  const v = Number(cents ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v / 100);
}

export function dollarsToCents(dollars: number): number { return Math.round(dollars * 100); }
export function centsToDollars(cents: number): number { return cents / 100; }
export function calculatePlatformFee(totalValueCents: number): number {
  return Math.round(totalValueCents * (PLATFORM_FEE_PCT / 100));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(dateStr));
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getStateNameFromCode(code: string): string {
  return US_STATES.find(s => s.code === code)?.name ?? code;
}
