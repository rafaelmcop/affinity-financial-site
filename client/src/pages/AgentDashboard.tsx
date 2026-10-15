import { useEffect } from "react";
import { AlertTriangle, CalendarClock, CheckCheck, Mail, MessageSquare, ShieldCheck, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useNotificationSound } from "@/hooks/useNotificationSound";
export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const q = trpc.agent.dashboard.useQuery(undefined, { refetchInterval: 30000 });
  const syncInbox = trpc.agent.syncInbox.useMutation();
  const markMessageRead = trpc.agent.markClientEmailRead.useMutation();
  const markTaskRead = trpc.agent.toggleTask.useMutation();
  const deleteTask = trpc.agent.deleteTask.useMutation();
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
  const pendingTasks = (d?.tasks || [])
    .filter(task => task.status === "pending")
    .sort((first, second) => {
      const firstIsPayment = first.title.startsWith("[Pagamento ") ? 0 : 1;
      const secondIsPayment = second.title.startsWith("[Pagamento ") ? 0 : 1;
      if (firstIsPayment !== secondIsPayment) return firstIsPayment - secondIsPayment;
      return new Date(String(first.dueAt || 0)).getTime() - new Date(String(second.dueAt || 0)).getTime();
    });
  const notificationTotal =
    (d?.notifications?.length || 0) + pendingTasks.length + (d?.profileAlerts?.length || 0);
  useNotificationSound("portal", notificationTotal, "affinity-agent-pending");
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
        {notificationTotal > 0 && <Card className="border-gold/30 bg-[#0b1524] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-gold">
                <AlertTriangle size={20} /> Central de notificações
              </h2>
              <p className="mt-1 text-sm text-gray-400">Tudo o que precisa da sua atenção, organizado por prioridade.</p>
            </div>
            <span className="rounded-full bg-gold px-3 py-1 text-sm font-bold text-black">
              {notificationTotal}
            </span>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {(d?.notifications?.length || 0) > 0 && <section className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-300">1 · Prioridade máxima</p>
                  <h3 className="mt-1 flex items-center gap-2 font-bold text-white"><MessageSquare size={18} /> Mensagens de clientes</h3>
                </div>
                <span className="rounded-full bg-red-400 px-2.5 py-1 text-xs font-bold text-black">{d?.notifications?.length || 0}</span>
              </div>
              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                {(d?.notifications || []).map(notification => (
                  <div
                    key={notification.id}
                    className="rounded-xl border border-red-300/25 bg-black/35 p-3 transition hover:border-red-200 hover:bg-red-400/10"
                  >
                    <button
                      type="button"
                      onClick={() => setLocation(`/agentes/clientes?cliente=${notification.clientId}`)}
                      className="w-full text-left"
                    >
                      <span className="block font-semibold text-white">{notification.clientName}</span>
                      <span className="mt-1 block truncate text-sm text-gray-200">{notification.body}</span>
                      <span className="mt-2 block text-xs text-red-200/80">{new Date(String(notification.sentAt)).toLocaleString("pt-BR")}</span>
                    </button>
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-red-200/10 pt-3">
                      <button
                        type="button"
                        onClick={() => setLocation(`/agentes/clientes?cliente=${notification.clientId}`)}
                        className="text-xs font-bold text-red-200 hover:text-white"
                      >
                        Abrir conversa
                      </button>
                      <button
                        type="button"
                        disabled={markMessageRead.isPending}
                        onClick={async () => {
                          await markMessageRead.mutateAsync({ id: notification.id });
                          await q.refetch();
                        }}
                        className="ml-auto rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-gray-200 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-50"
                      >
                        Marcar como lida
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>}

            {pendingTasks.length > 0 && <section className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">2 · Atenção necessária</p>
                  <h3 className="mt-1 flex items-center gap-2 font-bold text-white"><CalendarClock size={18} /> Tarefas e pagamentos</h3>
                </div>
                <span className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-black">{pendingTasks.length}</span>
              </div>
              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                {pendingTasks.map(task => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-amber-300/20 bg-black/30 p-3 transition hover:border-amber-300 hover:bg-amber-400/10"
                  >
                    <button
                      type="button"
                      onClick={() => setLocation(task.clientId ? `/agentes/clientes?cliente=${task.clientId}` : "/agentes/apolices")}
                      className="w-full text-left"
                    >
                      <span className="block font-semibold text-white">{task.title}</span>
                      <span className="mt-1 block text-xs text-gray-400">
                        {task.dueAt ? new Date(String(task.dueAt)).toLocaleString("pt-BR") : "Sem data definida"}
                      </span>
                      <span className="mt-2 block text-xs font-bold text-amber-300">Abrir pendência</span>
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-amber-200/10 pt-3">
                      <button
                        type="button"
                        disabled={markTaskRead.isPending}
                        onClick={async () => {
                          await markTaskRead.mutateAsync({ id: task.id, completed: true });
                          await q.refetch();
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-green-300/25 px-3 py-1 text-xs font-semibold text-green-200 transition hover:border-green-300 hover:bg-green-400/10 disabled:opacity-50"
                      >
                        <CheckCheck size={13} /> Marcar como lida
                      </button>
                      <button
                        type="button"
                        disabled={deleteTask.isPending}
                        onClick={async () => {
                          if (!window.confirm("Excluir esta pendência?")) return;
                          await deleteTask.mutateAsync({ id: task.id });
                          await q.refetch();
                        }}
                        className="ml-auto flex items-center gap-1.5 rounded-full border border-red-300/25 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-300 hover:bg-red-400/10 disabled:opacity-50"
                      >
                        <Trash2 size={13} /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>}

            {(d?.profileAlerts?.length || 0) > 0 && <section className="rounded-2xl border border-sky-400/25 bg-sky-400/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-sky-300">3 · Manutenção cadastral</p>
                  <h3 className="mt-1 flex items-center gap-2 font-bold text-white"><AlertTriangle size={18} /> Dados incompletos</h3>
                </div>
                <span className="rounded-full bg-sky-300 px-2.5 py-1 text-xs font-bold text-black">{d?.profileAlerts?.length || 0}</span>
              </div>
              <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
                {(d?.profileAlerts || []).map(alert => (
                  <button
                    key={`profile-${alert.clientId}`}
                    onClick={() => setLocation(`/agentes/clientes?cliente=${alert.clientId}&completar=1`)}
                    className="w-full rounded-xl border border-sky-300/20 bg-black/30 p-3 text-left transition hover:border-sky-300 hover:bg-sky-400/10"
                  >
                    <span className="block font-semibold text-white">{alert.clientName}</span>
                    <span className="mt-1 block text-sm text-sky-100/80">Faltando: {alert.missing.join(", ")}</span>
                    <span className="mt-2 block text-xs font-bold text-sky-300">Completar cadastro</span>
                  </button>
                ))}
              </div>
            </section>}
          </div>
        </Card>}
        <Card className="border-gold/20 bg-[#0b1524] p-6">
          <h2 className="text-xl font-bold text-gold">Suas apólices</h2>
          <p className="mt-4 text-5xl font-bold">{d?.policies.length || 0}</p>
          <p className="mt-2 text-sm text-gray-400">
            A pontuação usa o target premium anual de cada apólice.
          </p>
        </Card>
      </main>
    </div>
  );
}
