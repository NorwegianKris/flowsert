import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PlatformAdminRoute } from "@/components/PlatformAdminRoute";
import RoleRedirect from "./pages/RoleRedirect";
import PlatformDashboard from "./pages/PlatformDashboard";
import Auth from "./pages/Auth";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import AdminDashboard from "./pages/AdminDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import FreelancerRedirect from "./pages/FreelancerRedirect";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import Consent from "./pages/Consent";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Subprocessors from "./pages/Subprocessors";
import SecurityPage from "./pages/SecurityPage";
import Trust from "./pages/Trust";
import InviteAccept from "./pages/InviteAccept";
import AuthCallback from "./pages/AuthCallback";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/invite" element={<InviteAccept />} />
            
            <Route path="/register/freelancer/:companyCode" element={<FreelancerRedirect />} />
            <Route path="/register/jobseeker/:companyCode" element={<FreelancerRedirect />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/subprocessors" element={<Subprocessors />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/trust" element={<Trust />} />
            
            {/* Platform admin */}
            <Route path="/platform" element={<PlatformAdminRoute><PlatformDashboard /></PlatformAdminRoute>} />
            
            {/* Role-based redirect */}
            <Route path="/" element={<RoleRedirect />} />
            
            {/* Admin routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Worker routes */}
            <Route 
              path="/worker" 
              element={
                <ProtectedRoute requiredRole="worker">
                  <WorkerDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
