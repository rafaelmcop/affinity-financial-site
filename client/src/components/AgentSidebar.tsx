import {
  BarChart3,
  Contact,
  FileText,
  ListTodo,
  ExternalLink,
  LogOut,
  Settings,
  MessagesSquare,
  ChevronRight,
  ChevronDown,
  Star,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import FloatingInternalChat from "@/components/FloatingInternalChat";

const items = [
  ["Clientes", "/agentes/clientes", Contact],
  ["Apólices", "/agentes/apolices", FileText],
  ["Tarefas", "/agentes/tarefas", ListTodo],
  ["Avaliações", "/agentes/avaliacoes", Star],
  ["Configurações", "/agentes/configuracoes", Settings],
] as const;
export default function AgentSidebar() {
  const [location, setLocation] = useLocation();
  const crmRouteActive = location === "/agentes/crm" || location === "/agentes/mensagens";
  const [crmOpen, setCrmOpen] = useState(crmRouteActive);
  const logout = trpc.auth.logout.useMutation();
  const dashboard = trpc.agent.dashboard.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const incompleteProfiles = dashboard.data?.profileAlerts?.length || 0;
  const reviews = trpc.agent.listAssignedReviews.useQuery(undefined, { refetchInterval: 30000 });
  const pendingReviews = (reviews.data || []).filter(review => review.agentDecision === "pending").length;
  return (
    <>
    <aside className="w-full border-r border-gold/20 bg-[#0f1f36] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:overflow-y-auto">
      <div className="border-b border-gold/20 p-5">
        <div className="text-lg font-bold text-gold">Affinity Financial</div>
        <div className="mt-1 text-xs text-gray-400">Portal do Agente</div>
      </div>
      <nav className="space-y-1 p-4">
        <button
          onClick={() => setLocation("/agentes/dashboard")}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${location === "/agentes/dashboard" ? "bg-gold font-semibold text-black" : "text-gray-300 hover:bg-white/10"}`}
        >
          <BarChart3 size={18} />
          <span className="flex-1 text-left">Início</span>
        </button>
        <button
          type="button"
          aria-expanded={crmOpen}
          aria-controls="agent-crm-menu"
          onClick={() => setCrmOpen(open => !open)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${crmRouteActive ? "bg-gold font-semibold text-black" : "text-gray-300 hover:bg-white/10"}`}
        >
          <Contact size={18} />
          <span className="flex-1 text-left">CRM</span>
          {crmOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {crmOpen && <div id="agent-crm-menu" className="mb-2 ml-5 space-y-1 border-l border-gold/25 pl-3">
          <button
            onClick={() => setLocation("/agentes/crm")}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${location === "/agentes/crm" ? "bg-white/10 text-gold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Contact size={15} /> Clientes e acompanhamento
          </button>
          <button
            onClick={() => setLocation("/agentes/mensagens")}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${location === "/agentes/mensagens" ? "bg-white/10 text-gold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
          >
            <MessagesSquare size={15} /> Mensagens e automações
          </button>
        </div>}
        {items.map(([label, href, Icon]) => (
          <button
            key={href}
            onClick={() => setLocation(href)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${location === href ? "bg-gold font-semibold text-black" : "text-gray-300 hover:bg-white/10"}`}
          >
            <Icon size={18} />
            <span className="flex-1 text-left">{label}</span>
            {href === "/agentes/clientes" && incompleteProfiles > 0 && (
              <span className="min-w-6 rounded-full bg-amber-400 px-2 py-0.5 text-center text-xs font-black text-black">
                {incompleteProfiles > 99 ? "99+" : incompleteProfiles}
              </span>
            )}
            {href === "/agentes/avaliacoes" && pendingReviews > 0 && (
              <span className="min-w-6 rounded-full bg-amber-400 px-2 py-0.5 text-center text-xs font-black text-black">{pendingReviews > 99 ? "99+" : pendingReviews}</span>
            )}
          </button>
        ))}
        <div className="my-3 border-t border-white/10" />
        <button
          onClick={() => setLocation("/")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10"
        >
          <ExternalLink size={18} />
          Site principal
        </button>
        <button
          onClick={async () => {
            await logout.mutateAsync();
            localStorage.removeItem("agentSession");
            setLocation("/agentes");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10"
        >
          <LogOut size={18} />
          Sair
        </button>
      </nav>
    </aside>
    <FloatingInternalChat mode="agent" />
    </>
  );
}
