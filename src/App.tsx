import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewOS from "./pages/NewOS";
import OSList from "./pages/OSList";
import OSDetail from "./pages/OSDetail";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import Administration from "./pages/Administration";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new-os" element={<NewOS />} />
            <Route path="/os-list" element={<OSList />} />
            <Route path="/os/:id" element={<OSDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/admin" element={<Administration />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
