import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import AffiliateRegister from "./pages/AffiliateRegister";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SubmitPolicy from "./pages/SubmitPolicy";
import ResetPassword from "./pages/ResetPassword";
import AdminTestimonials from './pages/AdminTestimonials';
import UnifiedLogin from './pages/UnifiedLogin';
import PanelSelector from './pages/PanelSelector';
import AdminUserManagement from './pages/AdminUserManagement';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/painel/login" component={UnifiedLogin} />
      <Route path="/painel/seletor" component={PanelSelector} />
      <Route path="/painel/admin" component={AdminDashboard} />
      <Route path="/painel/admin/usuarios" component={AdminUserManagement} />
      <Route path="/painel/admin/depoimentos" component={AdminTestimonials} />
      <Route path="/painel/afiliado" component={AffiliateDashboard} />
      <Route path="/painel/registrar" component={AffiliateRegister} />
      <Route path="/painel/submeter-apolice" component={SubmitPolicy} />
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
