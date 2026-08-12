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
import AdminDashboard from "./pages/AdminDashboard";
import SmtpConfig from "./pages/SmtpConfig";
import ResetPassword from "./pages/ResetPassword";
import AdminAffiliatesManagement from './pages/AdminAffiliatesManagement';
import AdminTestimonials from './pages/AdminTestimonials';
import AdminAdministrators from './pages/AdminAdministrators';
import AdminCrm from './pages/AdminCrm';
import ReviewPage from './pages/ReviewPage';
import AdminReviews from './pages/AdminReviews';
import AgentLogin from './pages/AgentLogin';
import AdminAffiliateLeads from './pages/AdminAffiliateLeads';
import AgentDashboard from './pages/AgentDashboard';
import AgentPolicies from './pages/AgentPolicies';
import AgentTasks from './pages/AgentTasks';
import AgentMessages from './pages/AgentMessages';
import AgentClients from './pages/AgentClients';
import AgentSettings from './pages/AgentSettings';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/avaliar" component={ReviewPage} />
      <Route path="/afiliados" component={AffiliateLogin} />
      <Route path="/afiliados/login" component={AffiliateLogin} />
      <Route path="/afiliados/registrar" component={AffiliateRegister} />
      <Route path="/afiliados/dashboard" component={AffiliateDashboard} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/afiliados" component={AdminAffiliates} />
        <Route path="/admin/smtp-config" component={SmtpConfig} />
        <Route path="/admin/affiliates" component={AdminAffiliatesManagement} />
      <Route path="/admin/testimonials" component={AdminTestimonials} />
      <Route path="/admin/avaliacoes" component={AdminReviews} />
      <Route path="/admin/administradores" component={AdminAdministrators} />
      <Route path="/admin/crm">{() => <AdminCrm />}</Route>
      <Route path="/admin/leads-afiliados" component={AdminAffiliateLeads} />
      <Route path="/agentes" component={AgentLogin} />
      <Route path="/agentes/login" component={AgentLogin} />
      <Route path="/agentes/crm">{() => <AdminCrm agentMode />}</Route>
      <Route path="/agentes/dashboard" component={AgentDashboard} />
      <Route path="/agentes/clientes" component={AgentClients} />
      <Route path="/agentes/apolices">{() => <AgentPolicies />}</Route>
      <Route path="/agentes/pcsheet">{() => <AgentPolicies uploadOnly />}</Route>
      <Route path="/agentes/tarefas" component={AgentTasks} />
      <Route path="/agentes/mensagens" component={AgentMessages} />
      <Route path="/agentes/configuracoes" component={AgentSettings} />
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
