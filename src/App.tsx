import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import CompleteSetup from "./pages/CompleteSetup.tsx";
import NotFound from "./pages/NotFound.tsx";
import DashboardLayout from "./components/dashboard/DashboardLayout.tsx";
import DashboardHome from "./pages/dashboard/DashboardHome.tsx";
import MyRfps from "./pages/dashboard/MyRfps.tsx";
import NewRfp from "./pages/dashboard/NewRfp.tsx";
import RfpDetail from "./pages/dashboard/RfpDetail.tsx";
import MyBids from "./pages/dashboard/MyBids.tsx";
import BrowseRfps from "./pages/dashboard/BrowseRfps.tsx";
import Contracts from "./pages/dashboard/Contracts.tsx";
import ContractDetail from "./pages/dashboard/ContractDetail.tsx";
import Invoices from "./pages/dashboard/Invoices.tsx";
import ComingSoon from "./components/dashboard/ComingSoon.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Index />} />
          <Route path="/auth/complete-setup" element={<CompleteSetup />} />

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="rfps" element={<MyRfps />} />
            <Route path="rfps/new" element={<NewRfp />} />
            <Route path="rfps/:id" element={<RfpDetail />} />
            <Route path="browse" element={<BrowseRfps />} />
            <Route path="browse/:id" element={<RfpDetail />} />
            <Route path="bids" element={<MyBids />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="contracts/:id" element={<ContractDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="profile" element={<ComingSoon title="Profile" />} />
            <Route path="firm-profile" element={<ComingSoon title="Firm profile" />} />
            <Route path="admin/firms" element={<ComingSoon title="Audit firms (admin)" />} />
            <Route path="admin/billing" element={<ComingSoon title="Billing (admin)" />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
