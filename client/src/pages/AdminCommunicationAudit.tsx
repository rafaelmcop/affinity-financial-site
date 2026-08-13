import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Mail, Megaphone, MessageCircle, Search, Send, ShieldCheck, Trash2, UserRound } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const date = (value: unknown) => value ? new Date(String(value)).toLocaleString("pt-BR") : "Data não registrada";

export default function AdminCommunicationAudit() {
  const utils = trpc.useUtils();
  const audit = trpc.crm.communicationAudit.useQuery(undefined, { refetchInterval: 30000 });
  const agents = trpc.crm.assignees.useQuery();
  const removeAudit = trpc.crm.deleteAuditedMessage.useMutation();
  const [agentFilter, setAgentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"individual" | "collective" | "internal">("individual");
  const [openAgents, setOpenAgents] = useState<Record<string, boolean>>({});
  const [openClients, setOpenClients] = useState<Record<string, boolean>>({});
  const [chatAgent, setChatAgent] = useState("");
  const [chatBody, setChatBody] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const internal = trpc.crm.internalMessages.useQuery(
    { mode: "admin", agentEmail: chatAgent || undefined },
    { enabled: view === "internal" && Boolean(chatAgent), refetchInterval: 15000 }
  );
  const sendInternal = trpc.crm.sendInternalMessage.useMutation();
  const markRead = trpc.crm.markInternalMessagesRead.useMutation();
  const deleteInternal = trpc.crm.deleteInternalMessage.useMutation();
  const agentNames = useMemo(() => new Map((agents.data || []).map(item => [item.email.toLowerCase(), item.name])), [agents.data]);
  const text = search.trim().toLowerCase();
  const conversations = (audit.data?.conversations || []).filter(item =>
    (agentFilter === "all" || item.agentEmail.toLowerCase() === agentFilter) &&
    (!text || `${item.clientName} ${item.subject} ${item.body} ${item.agentEmail}`.toLowerCase().includes(text))
  );
  const grouped = useMemo(() => {
    const result = new Map<string, Map<number, { name: string; items: typeof conversations }>>();
    for (const item of conversations) {
      const agentEmail = item.agentEmail.toLowerCase();
      if (!result.has(agentEmail)) result.set(agentEmail, new Map());
      const clients = result.get(agentEmail)!;
      if (!clients.has(item.clientId)) clients.set(item.clientId, { name: item.clientName, items: [] });
      clients.get(item.clientId)!.items.push(item);
    }
    return result;
  }, [conversations]);
  const campaigns = (audit.data?.campaigns || []).filter(item =>
    (agentFilter === "all" || item.agentEmail.toLowerCase() === agentFilter) &&
    (!text || `${item.title} ${item.subject} ${item.message} ${item.agentEmail}`.toLowerCase().includes(text))
  );
  useEffect(() => {
    if (!chatAgent || view !== "internal") return;
    markRead.mutate({ mode: "admin", agentEmail: chatAgent });
  }, [chatAgent, internal.data?.length, view]);
  useEffect(() => chatEnd.current?.scrollIntoView({ behavior: "smooth" }), [internal.data?.length]);
  const deleteAudited = async (id: number) => {
    if (!window.confirm("Remover esta mensagem da visualização? A exclusão ficará registrada para auditoria.")) return;
    await removeAudit.mutateAsync({ id });
    await audit.refetch();
    toast.success("Mensagem removida com registro de auditoria");
  };

  return <div className="min-h-screen bg-black text-white lg:pl-64"><AdminSidebar /><main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <div><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.2em] text-gold"><ShieldCheck size={18} /> Controle e auditoria</p><h1 className="mt-2 text-3xl font-bold">Comunicações dos agentes</h1><p className="mt-2 text-gray-400">Organizadas por agente, cliente e data, com canal direto entre a administração e a equipe.</p></div>
    <Card className="grid gap-3 border-gold/20 bg-[#0b1524] p-4 md:grid-cols-[1fr_15rem]"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" /><Input className="pl-9" placeholder="Buscar cliente, assunto ou conteúdo" value={search} onChange={e => setSearch(e.target.value)} /></label><select className="h-10 rounded-md border border-white/20 bg-black px-3" value={agentFilter} onChange={e => setAgentFilter(e.target.value)}><option value="all">Todos os agentes</option>{(agents.data || []).filter(item => ["agent", "both"].includes((item as any).accountType || "agent")).map(item => <option key={item.id} value={item.email.toLowerCase()}>{item.name}</option>)}</select></Card>
    <div className="flex flex-wrap gap-2">{([['individual','Agentes e clientes'],['collective','Campanhas coletivas'],['internal','Falar com agentes']] as const).map(([key,label]) => <button key={key} onClick={() => setView(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === key ? 'bg-gold text-black' : 'bg-white/5 text-gray-300'}`}>{label}</button>)}</div>

    {view === "individual" && <div className="space-y-4">{Array.from(grouped.entries()).map(([agentEmail, clients]) => {
      const agentOpen = openAgents[agentEmail] ?? true;
      const total = Array.from(clients.values()).reduce((sum, client) => sum + client.items.length, 0);
      return <Card key={agentEmail} className="overflow-hidden border-gold/25 bg-[#0b1524]"><button className="flex w-full items-center gap-3 p-5 text-left" onClick={() => setOpenAgents(v => ({...v,[agentEmail]:!agentOpen}))}>{agentOpen ? <ChevronDown /> : <ChevronRight />}<UserRound className="text-gold" /><span className="flex-1"><b className="block text-lg text-gold">{agentNames.get(agentEmail) || agentEmail}</b><span className="text-xs text-gray-400">{agentEmail} · {clients.size} cliente(s)</span></span><span className="rounded-full bg-gold/15 px-3 py-1 text-xs text-gold">{total} mensagem(ns)</span></button>{agentOpen && <div className="space-y-3 border-t border-white/10 p-4">{Array.from(clients.entries()).map(([clientId, client]) => {
        const key = `${agentEmail}-${clientId}`, clientOpen = openClients[key] ?? false;
        return <div key={key} className="overflow-hidden rounded-xl border border-white/10 bg-black/25"><button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpenClients(v => ({...v,[key]:!clientOpen}))}>{clientOpen ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}<span className="flex-1 font-semibold">{client.name}</span><span className="text-xs text-gray-400">{client.items.length} mensagem(ns)</span></button>{clientOpen && <div className="space-y-3 border-t border-white/10 p-3">{client.items.map(item => <div key={item.id} className={`rounded-xl p-4 ${item.direction === 'sent' ? 'ml-4 bg-gold/10' : 'mr-4 bg-sky-500/10'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-gray-400">{item.direction === 'sent' ? 'Agente → Cliente' : 'Cliente → Agente'} · {date(item.sentAt)}</p><p className="mt-1 font-semibold"><Mail className="mr-2 inline h-4 w-4" />{item.subject}</p></div><Button size="icon" variant="ghost" className="text-red-300" onClick={() => deleteAudited(item.id)}><Trash2 size={16}/></Button></div><p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{item.body}</p></div>)}</div>}</div>})}</div>}</Card>})}{!audit.isLoading && !grouped.size && <p className="py-10 text-center text-gray-500">Nenhuma conversa encontrada.</p>}</div>}

    {view === "collective" && <div className="space-y-3">{campaigns.map(item => <Card key={`${item.id}-${item.sentKey}`} className="border-white/10 bg-[#0b1524] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-gold"><Megaphone className="mr-2 inline h-4 w-4" />{item.title}</p><p className="text-xs text-gray-400">Agente: {agentNames.get(item.agentEmail.toLowerCase()) || item.agentEmail}</p></div><span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-300">{item.recipientCount} destinatário(s)</span></div><p className="mt-3 text-sm font-semibold">{item.subject}</p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{item.message}</p><p className="mt-3 text-xs text-gray-500">Envio: {date(item.sentAt)} · Registro: {item.sentKey}</p></Card>)}</div>}

    {view === "internal" && <div className="grid gap-5 lg:grid-cols-[18rem_1fr]"><Card className="h-fit border-gold/20 bg-[#0b1524] p-3"><p className="px-2 pb-3 text-sm font-bold text-gold">Selecione o agente</p>{(agents.data || []).map(item => <button key={item.id} onClick={() => setChatAgent(item.email.toLowerCase())} className={`mb-1 w-full rounded-lg px-3 py-3 text-left text-sm ${chatAgent === item.email.toLowerCase() ? 'bg-gold font-bold text-black' : 'hover:bg-white/10'}`}>{item.name}<span className="block text-xs opacity-60">{item.email}</span></button>)}</Card><Card className="border-gold/20 bg-[#0b1524] p-5">{!chatAgent ? <div className="py-20 text-center text-gray-500"><MessageCircle className="mx-auto mb-3" />Escolha um agente para iniciar a conversa.</div> : <><h2 className="font-bold text-gold">Conversa com {agentNames.get(chatAgent) || chatAgent}</h2><div className="mt-4 flex max-h-[32rem] min-h-80 flex-col gap-3 overflow-y-auto rounded-xl bg-black/35 p-4">{(internal.data || []).map(message => { const fromAgent = message.senderEmail.toLowerCase() === chatAgent; return <div key={message.id} className={`max-w-[85%] rounded-2xl p-3 ${fromAgent ? 'mr-auto bg-sky-500/15' : 'ml-auto bg-gold text-black'}`}><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold">{fromAgent ? agentNames.get(chatAgent) : 'Administração'}</span><button className="opacity-60 hover:opacity-100" onClick={async () => { if (!window.confirm('Remover esta mensagem?')) return; await deleteInternal.mutateAsync({ id: message.id }); await internal.refetch(); }}><Trash2 size={14}/></button></div><p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p><p className="mt-1 text-[10px] opacity-60">{date(message.sentAt)}</p></div>})}<div ref={chatEnd}/></div><div className="mt-3 flex gap-2"><Input value={chatBody} onChange={e => setChatBody(e.target.value)} placeholder="Mensagem para o agente" onKeyDown={async e => { if (e.key === 'Enter' && chatBody.trim()) { await sendInternal.mutateAsync({ mode:'admin',agentEmail:chatAgent,body:chatBody.trim() }); setChatBody(''); await internal.refetch(); }}}/><Button className="bg-gold text-black" disabled={!chatBody.trim()} onClick={async () => { await sendInternal.mutateAsync({ mode:'admin',agentEmail:chatAgent,body:chatBody.trim() }); setChatBody(''); await internal.refetch(); await utils.crm.internalUnreadCount.invalidate(); }}><Send size={16}/></Button></div></>}</Card></div>}
  </main></div>;
}
