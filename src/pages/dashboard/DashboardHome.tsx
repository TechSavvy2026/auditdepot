import { useDashboard } from "@/components/dashboard/DashboardLayout";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import EntityDashboard from "@/components/dashboard/EntityDashboard";
import FirmDashboard from "@/components/dashboard/FirmDashboard";

export default function DashboardHome() {
  const { role } = useDashboard();
  if (role === "admin") return <AdminDashboard />;
  if (role === "firm_user") return <FirmDashboard />;
  return <EntityDashboard />;
}
