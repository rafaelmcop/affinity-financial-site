import {
  BarChart3,
  Contact,
  FileText,
  ListTodo,
  ExternalLink,
  LogOut,
  Settings,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import FloatingInternalChat from "@/components/FloatingInternalChat";

const items = [
  ["Início", "/agentes/dashboard", BarChart3],
  ["CRM", "/agentes/crm", Contact],
  ["Clientes", "/agentes/clientes", Contact],
  ["Apólices", "/agentes/apolices", FileText],
  ["Tarefas", "/agentes/tarefas", ListTodo],
  ["Configurações", "/agentes/configuracoes", Settings],
] as const;
export default function AgentSidebar() {
  const [location, setLocation] = useLocation();
  const logout = trpc.auth.logout.useMutation();
  const dashboard = trpc.agent.dashboard.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const incompleteProfiles = dashboard.data?.profileAlerts?.length || 0;
  return (
    <>
    <aside className="w-full border-r border-gold/20 bg-[#0f1f36] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:overflow-y-auto">
      <div className="border-b border-gold/20 p-5">
        <div className="text-lg font-bold text-gold">Affinity Financial</div>
        <div className="mt-1 text-xs text-gray-400">Portal do Agente</div>
      </div>
      <nav className="space-y-1 p-4">
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
