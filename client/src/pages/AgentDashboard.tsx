import { CalendarClock, Mail, MessageSquare, ShieldCheck } from "lucide-react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
export default function AgentDashboard() {
  const q = trpc.agent.dashboard.useQuery();
  const d = q.data;
  const cards = [
    ["Mensagens novas", d?.newMessages || 0, MessageSquare],
    ["E-mails novos", 0, Mail],
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
