import { useEffect } from "react";
import { AlertTriangle, CalendarClock, Mail, MessageSquare, ShieldCheck, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const q = trpc.agent.dashboard.useQuery(undefined, { refetchInterval: 30000 });
  const syncInbox = trpc.agent.syncInbox.useMutation();
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        await syncInbox.mutateAsync();
        if (active) await q.refetch();
      } catch {
        // Connection details are available in the client's conversation screen.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  const d = q.data;
  const cards = [
    ["Perfis incompletos", d?.profileAlerts?.length || 0, AlertTriangle],
    ["E-mails novos", d?.newMessages || 0, Mail],
    ["Follow-ups", d?.followUps || 0, CalendarClock],
    ["Pontuação", d?.score || 0, ShieldCheck],
  ] as const;
  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AgentSidebar />
      <main className="mx-auto max-w-6xl space-y-7 px-4 py-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
            Visão geral
          </p>
          <h1 className="mt-2 text-3xl font-bold">Painel do Agente</h1>
          <p className="mt-2 text-gray-400">
            Seus clientes, compromissos e resultados em um só lugar.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value, Icon]) => (
            <Card key={label} className="border-gold/20 bg-[#0b1524] p-5">
              <Icon className="text-gold" />
              <p className="mt-4 text-sm text-gray-400">{label}</p>
              <p className="mt-1 text-3xl font-bold text-white">{value}</p>
            </Card>
          ))}
        </div>
        <Card className="border-gold/30 bg-[#0b1524] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-gold">
                <Mail size={20} /> Notificações
              </h2>
              <p className="mt-1 text-sm text-gray-400">Respostas novas e cadastros que precisam de atenção.</p>
            </div>
            <span className="rounded-full bg-gold px-3 py-1 text-sm font-bold text-black">
              {(d?.newMessages || 0) + (d?.profileAlerts?.length || 0)}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {(d?.profileAlerts || []).map(alert => (
              <button
                key={`profile-${alert.clientId}`}
                onClick={() => setLocation(`/agentes/clientes?cliente=${alert.clientId}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-left transition hover:border-amber-300 hover:bg-amber-400/15"
              >
                <span className="rounded-full bg-amber-400/15 p-2 text-amber-300"><AlertTriangle size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Perfil incompleto: {alert.clientName}</span>
                  <span className="block text-sm text-amber-100/80">Faltando: {alert.missing.join(", ")}</span>
                </span>
                <span className="text-sm font-semibold text-gold">Corrigir</span>
              </button>
            ))}
            {(d?.notifications || []).map(notification => (
              <button
                key={notification.id}
                onClick={() => setLocation(`/agentes/clientes?cliente=${notification.clientId}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-gold/60 hover:bg-gold/10"
              >
                <span className="rounded-full bg-sky-500/15 p-2 text-sky-300"><UserRound size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{notification.clientName}</span>
                  <span className="block truncate text-sm text-gray-300">{notification.body}</span>
                  <span className="mt-1 block text-xs text-gray-500">{new Date(String(notification.sentAt)).toLocaleString("pt-BR")}</span>
                </span>
                <span className="text-sm font-semibold text-gold">Abrir caso</span>
              </button>
            ))}
            {!d?.notifications?.length && !d?.profileAlerts?.length && (
              <p className="rounded-xl bg-black/20 py-8 text-center text-sm text-gray-500">Nenhuma pendência.</p>
            )}
          </div>
        </Card>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-gold/20 bg-[#0b1524] p-6">
            <h2 className="text-xl font-bold text-gold">Próximas tarefas</h2>
            <div className="mt-4 space-y-3">
              {(d?.tasks || [])
                .filter(t => t.status === "pending")
                .slice(0, 5)
                .map(t => (
                  <div key={t.id} className="rounded-lg bg-black/30 p-3">
                    <p>{t.title}</p>
                    <p className="text-xs text-gray-500">
                      {t.dueAt
                        ? new Date(String(t.dueAt)).toLocaleString("pt-BR")
                        : "Sem data"}
                    </p>
                  </div>
                ))}
              {!d?.pendingTasks && (
                <p className="text-sm text-gray-500">
                  Nenhuma tarefa pendente.
                </p>
              )}
            </div>
          </Card>
          <Card className="border-gold/20 bg-[#0b1524] p-6">
            <h2 className="text-xl font-bold text-gold">Suas apólices</h2>
            <p className="mt-4 text-5xl font-bold">{d?.policies.length || 0}</p>
            <p className="mt-2 text-sm text-gray-400">
              A pontuação usa o target premium anual de cada apólice.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
