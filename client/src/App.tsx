import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import AffiliateLogin from "./pages/AffiliateLogin";
import AffiliateRegister from "./pages/AffiliateRegister";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import SmtpConfig from "./pages/SmtpConfig";
import ResetPassword from "./pages/ResetPassword";
import AdminTestimonials from "./pages/AdminTestimonials";
import AdminCrm from "./pages/AdminCrm";
import AdminAgentPortfolio from "./pages/AdminAgentPortfolio";
import ReviewPage from "./pages/ReviewPage";
import AdminReviews from "./pages/AdminReviews";
import AgentReviews from "./pages/AgentReviews";
import AgentLogin from "./pages/AgentLogin";
import AdminAffiliateLeads from "./pages/AdminAffiliateLeads";
import AgentDashboard from "./pages/AgentDashboard";
import AgentPolicies from "./pages/AgentPolicies";
import AgentTasks from "./pages/AgentTasks";
import AgentMessages from "./pages/AgentMessages";
import AgentClients from "./pages/AgentClients";
import AgentSettings from "./pages/AgentSettings";
import AdminUsers from "./pages/AdminUsers";
import AdminCommunicationAudit from "./pages/AdminCommunicationAudit";
import AgentInternalMessages from "./pages/AgentInternalMessages";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);
  return null;
}

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
      <Route path="/admin/afiliados" component={AdminUsers} />
      <Route path="/admin/smtp-config" component={SmtpConfig} />
      <Route path="/admin/affiliates" component={AdminUsers} />
      <Route path="/admin/testimonials" component={AdminTestimonials} />
      <Route path="/admin/avaliacoes" component={AdminReviews} />
      <Route path="/agentes/avaliacoes" component={AgentReviews} />
      <Route path="/admin/administradores" component={AdminUsers} />
      <Route path="/admin/usuarios" component={AdminUsers} />
      <Route path="/admin/crm">{() => <AdminCrm />}</Route>
      <Route path="/admin/carteiras-agentes" component={AdminAgentPortfolio} />
      <Route
        path="/admin/auditoria-comunicacoes"
        component={AdminCommunicationAudit}
      />
      <Route path="/admin/leads-afiliados" component={AdminAffiliateLeads} />
      <Route path="/agentes" component={AgentLogin} />
      <Route path="/agentes/login" component={AgentLogin} />
      <Route path="/agentes/crm">{() => <AdminCrm agentMode />}</Route>
      <Route path="/agentes/dashboard" component={AgentDashboard} />
      <Route path="/agentes/clientes" component={AgentClients} />
      <Route path="/agentes/apolices">{() => <AgentPolicies />}</Route>
      <Route path="/agentes/pcsheet">
        {() => <AgentPolicies uploadOnly />}
      </Route>
      <Route path="/agentes/tarefas" component={AgentTasks} />
      <Route path="/agentes/mensagens" component={AgentMessages} />
      <Route
        path="/agentes/mensagens-internas"
        component={AgentInternalMessages}
      />
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
            <ScrollToTop />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
