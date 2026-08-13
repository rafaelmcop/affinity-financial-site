import { useMemo, useState } from "react";
import { Mail, Megaphone, Search, ShieldCheck } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const date = (value: unknown) =>
  value ? new Date(String(value)).toLocaleString("pt-BR") : "Data não registrada";

export default function AdminCommunicationAudit() {
  const audit = trpc.crm.communicationAudit.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const agents = trpc.crm.assignees.useQuery();
  const [agent, setAgent] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"individual" | "collective">("individual");
  const agentNames = useMemo(
    () => new Map((agents.data || []).map(item => [item.email.toLowerCase(), item.name])),
    [agents.data]
  );
  const text = search.trim().toLowerCase();
  const conversations = (audit.data?.conversations || []).filter(item =>
    (agent === "all" || item.agentEmail.toLowerCase() === agent) &&
    (!text || `${item.clientName} ${item.subject} ${item.body} ${item.agentEmail}`.toLowerCase().includes(text))
  );
  const campaigns = (audit.data?.campaigns || []).filter(item =>
    (agent === "all" || item.agentEmail.toLowerCase() === agent) &&
    (!text || `${item.title} ${item.subject} ${item.message} ${item.agentEmail}`.toLowerCase().includes(text))
  );

  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AdminSidebar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.2em] text-gold"><ShieldCheck size={18} /> Controle e auditoria</p>
          <h1 className="mt-2 text-3xl font-bold">Comunicações dos agentes</h1>
          <p className="mt-2 text-gray-400">Consulte conversas individuais e campanhas coletivas, identificadas por agente, cliente e data.</p>
        </div>
        <Card className="grid gap-3 border-gold/20 bg-[#0b1524] p-4 md:grid-cols-[1fr_15rem]">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" /><Input className="pl-9" placeholder="Buscar cliente, assunto ou conteúdo" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <select className="h-10 rounded-md border border-white/20 bg-black px-3" value={agent} onChange={event => setAgent(event.target.value)}>
            <option value="all">Todos os agentes</option>
            {(agents.data || []).map(item => <option key={item.id} value={item.email.toLowerCase()}>{item.name}</option>)}
          </select>
        </Card>
        <div className="flex gap-2">
          <button onClick={() => setView("individual")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "individual" ? "bg-gold text-black" : "bg-white/5 text-gray-300"}`}>Conversas individuais</button>
          <button onClick={() => setView("collective")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "collective" ? "bg-gold text-black" : "bg-white/5 text-gray-300"}`}>Campanhas coletivas</button>
        </div>
        {view === "individual" ? (
          <div className="space-y-3">
            {conversations.map(item => <Card key={item.id} className="border-white/10 bg-[#0b1524] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-gold">{item.clientName}</p><p className="text-xs text-gray-400">Agente: {agentNames.get(item.agentEmail.toLowerCase()) || item.agentEmail}</p></div><span className={`rounded-full px-3 py-1 text-xs ${item.direction === "sent" ? "bg-gold/15 text-gold" : "bg-sky-500/15 text-sky-300"}`}>{item.direction === "sent" ? "Enviada" : "Recebida"}</span></div>
              <p className="mt-3 text-sm font-semibold"><Mail className="mr-2 inline h-4 w-4" />{item.subject}</p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{item.body}</p><p className="mt-3 text-xs text-gray-500">{item.fromEmail} → {item.toEmail} · {date(item.sentAt)}</p>
            </Card>)}
            {!audit.isLoading && !conversations.length && <p className="py-10 text-center text-gray-500">Nenhuma conversa encontrada.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(item => <Card key={`${item.id}-${item.sentKey}`} className="border-white/10 bg-[#0b1524] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-gold"><Megaphone className="mr-2 inline h-4 w-4" />{item.title}</p><p className="text-xs text-gray-400">Agente: {agentNames.get(item.agentEmail.toLowerCase()) || item.agentEmail}</p></div><span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-300">{item.recipientCount} destinatário(s)</span></div>
              <p className="mt-3 text-sm font-semibold">{item.subject}</p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{item.message}</p><p className="mt-3 text-xs text-gray-500">Envio: {date(item.sentAt)} · Registro: {item.sentKey}</p>
            </Card>)}
            {!audit.isLoading && !campaigns.length && <p className="py-10 text-center text-gray-500">Nenhuma campanha encontrada.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
