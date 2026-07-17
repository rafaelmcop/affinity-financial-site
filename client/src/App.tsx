import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import AffiliateLogin from "./pages/AffiliateLogin";
import AffiliateRegister from "./pages/AffiliateRegister";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AdminAffiliates from "./pages/AdminAffiliates";
import AdminLogin from "./pages/AdminLogin";
import SubmitPolicy from "./pages/SubmitPolicy";
import AdminDashboard from "./pages/AdminDashboard";
import SmtpConfig from "./pages/SmtpConfig";
import ResetPassword from "./pages/ResetPassword";
import AdminAffiliatesManagement from "./pages/AdminAffiliatesManagement";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/afiliados" component={AffiliateLogin} />
      <Route path="/afiliados/login" component={AffiliateLogin} />
      <Route path="/afiliados/registrar" component={AffiliateRegister} />
      <Route path="/afiliados/dashboard" component={AffiliateDashboard} />
      <Route path="/afiliados/submeter-apolice" component={SubmitPolicy} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/afiliados" component={AdminAffiliates} />
        <Route path="/admin/smtp-config" component={SmtpConfig} />
        <Route path="/admin/affiliates" component={AdminAffiliatesManagement} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
