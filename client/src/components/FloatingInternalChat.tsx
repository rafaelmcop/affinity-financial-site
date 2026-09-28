import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageCircle, Search, Send, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNotificationSound } from "@/hooks/useNotificationSound";

type Props = { mode: "admin" | "agent" };
type Presence = "available" | "away" | "meeting" | "offline";
type Contact = { email: string; name: string; presence: Presence };
const presenceLabel: Record<Presence, string> = { available: "Disponível", away: "Ausente", meeting: "Em reunião", offline: "Offline" };
const presenceColor: Record<Presence, string> = { available: "bg-emerald-400", away: "bg-amber-400", meeting: "bg-red-500", offline: "bg-gray-500" };
const effectivePresence = (status: unknown, lastSeenAt: unknown): Presence => {
  const seen = new Date(String(lastSeenAt || "")).getTime();
  if (!Number.isFinite(seen) || Date.now() - seen > 2 * 60 * 1000) return "offline";
  return ["available", "away", "meeting"].includes(String(status)) ? status as Presence : "available";
};

export default function FloatingInternalChat({ mode }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const messageContainer = useRef<HTMLDivElement>(null);
  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("agentSession") || "{}");
    } catch {
      return {};
    }
  }, []);
  const agents = trpc.crm.assignees.useQuery(undefined, { refetchInterval: 30000 });
  const presence = trpc.crm.presence.useQuery(undefined, { refetchInterval: 30000 });
  const myEmail = String(presence.data?.currentEmail || session.email || "").toLowerCase();
  const setPresence = trpc.crm.setPresence.useMutation();
  const unread = trpc.crm.internalUnreadCount.useQuery(
    { mode },
    { refetchInterval: 10000 }
  );
  const contacts = useMemo<Contact[]>(() => {
    const presenceUsers = presence.data?.users || [];
    const statusFor = (email: string) => {
      const user = presenceUsers.find(item => item.email.toLowerCase() === email.toLowerCase());
      return effectivePresence(user?.presenceStatus, user?.lastSeenAt);
    };
    const list = (Array.isArray(agents.data) ? agents.data : [])
      .filter(item =>
        ["agent", "both"].includes(String(item.accountType || "")) &&
        item.email.toLowerCase() !== myEmail
      )
      .map(item => ({ email: item.email.toLowerCase(), name: item.name, presence: statusFor(item.email) }));
    const adminStatuses = presenceUsers.filter(item => ["admin", "both"].includes(String(item.accountType))).map(item => effectivePresence(item.presenceStatus, item.lastSeenAt));
    const adminPresence: Presence = adminStatuses.includes("available") ? "available" : adminStatuses.includes("meeting") ? "meeting" : adminStatuses.includes("away") ? "away" : "offline";
    return mode === "agent"
      ? [{ email: "__admin__", name: "Administração", presence: adminPresence }, ...list]
      : list;
  }, [agents.data, mode, myEmail, presence.data]);
  const activeEmail = selectedEmail || contacts[0]?.email || "";
  const peerEmail = mode === "agent" && activeEmail !== "__admin__" ? activeEmail : undefined;
  const agentEmail = mode === "admin" ? activeEmail || undefined : undefined;
  const messages = trpc.crm.internalMessages.useQuery(
    { mode, agentEmail, peerEmail },
    { enabled: open && Boolean(activeEmail), refetchInterval: 10000 }
  );
  const send = trpc.crm.sendInternalMessage.useMutation();
  const markRead = trpc.crm.markInternalMessagesRead.useMutation();
  const utils = trpc.useUtils();
  const messageList = Array.isArray(messages.data) ? messages.data : [];
  const activeContact = contacts.find(item => item.email === activeEmail);
  const filteredContacts = contacts.filter(item =>
    `${item.name} ${item.email}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const count = Number(unread.data?.count || 0);
  useNotificationSound("chat", count, `affinity-chat-unread-${mode}`);
  const currentUser = (presence.data?.users || []).find(item => item.email.toLowerCase() === presence.data?.currentEmail.toLowerCase());
  const myName = String(currentUser?.name || session.name || myEmail || "Usuário");
  const myRole = mode === "admin" ? "Admin" : "Agente";
  const myPresence = String(currentUser?.presenceStatus || "available") as "available" | "away" | "meeting";

  useEffect(() => {
    if (!open || !activeEmail) return;
    markRead.mutate({ mode, agentEmail, peerEmail });
  }, [open, activeEmail, messageList.length]);

  useEffect(() => {
    if (!open) return;
    const container = messageContainer.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [open, activeEmail, messageList.length]);

  const submit = async () => {
    const value = body.trim();
    if (!value || !activeEmail) return;
    try {
      await send.mutateAsync({ mode, agentEmail, peerEmail, body: value });
      setBody("");
      await messages.refetch();
      await utils.crm.internalUnreadCount.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a mensagem");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={count ? `Abrir chat, ${count} mensagem(ns) nova(s)` : "Abrir chat"}
        className="fixed bottom-5 right-4 z-[70] flex h-14 items-center gap-3 rounded-full border border-gold/50 bg-[#122742] px-5 text-white shadow-2xl shadow-black/50 transition hover:-translate-y-0.5 hover:bg-[#193554] sm:right-6"
      >
        <span className="relative">
          <MessageCircle className="text-gold" size={24} />
          {count > 0 && <span className="absolute -right-3 -top-3 min-w-5 rounded-full bg-red-500 px-1.5 text-center text-[11px] font-black leading-5 text-white">{count > 99 ? "99+" : count}</span>}
        </span>
        <span className="text-sm font-bold">Mensagens</span>
      </button>
    );
  }

  return (
    <section className="fixed bottom-3 right-3 z-[70] flex h-[min(42rem,calc(100vh-1.5rem))] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-gold/35 bg-[#0b1524] text-white shadow-2xl shadow-black/70 sm:bottom-6 sm:right-6">
      <header className="flex items-center gap-3 border-b border-gold/20 bg-[#122742] px-4 py-3">
        <MessageCircle className="text-gold" size={21} />
        <div className="min-w-0 flex-1"><p className="font-bold">{myName} <span className="font-normal text-gold">({myRole})</span></p><p className="flex items-center gap-2 truncate text-xs text-gray-400">Conversando com: {activeContact && <span title={presenceLabel[activeContact.presence]} aria-label={presenceLabel[activeContact.presence]} className={`h-2.5 w-2.5 shrink-0 rounded-full ${presenceColor[activeContact.presence]}`} />}{activeContact?.name || "Selecione um contato"}</p></div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-300 hover:bg-white/10" aria-label="Minimizar chat"><ChevronDown size={20} /></button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-300 hover:bg-white/10" aria-label="Fechar chat"><X size={19} /></button>
      </header>
      <div className="border-b border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${presenceColor[effectivePresence(myPresence, currentUser?.lastSeenAt)]}`} /><select value={myPresence} onChange={async event => { await setPresence.mutateAsync({ status: event.target.value as "available" | "away" | "meeting" }); await presence.refetch(); }} className="h-8 flex-1 rounded-md border border-white/10 bg-[#0b1524] px-2 text-xs text-white" aria-label="Meu status"><option value="available">Disponível</option><option value="away">Ausente</option><option value="meeting">Em reunião</option></select></div>
        <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" /><Input className="h-9 pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar contato" /></label>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {filteredContacts.map(contact => <button key={contact.email} type="button" onClick={() => setSelectedEmail(contact.email)} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${activeEmail === contact.email ? "bg-gold text-black" : "bg-white/10 text-gray-200 hover:bg-white/15"}`}><span title={presenceLabel[contact.presence]} aria-label={presenceLabel[contact.presence]} className={`h-2.5 w-2.5 rounded-full ${presenceColor[contact.presence]}`} />{contact.name}</button>)}
        </div>
      </div>
      <div ref={messageContainer} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-black/25 p-4">
        {messageList.map(message => {
          const mine = message.senderEmail.toLowerCase() === (mode === "agent" ? myEmail : String(message.senderEmail).toLowerCase() !== activeEmail ? String(message.senderEmail).toLowerCase() : "");
          const fromMe = mode === "admin" ? message.senderEmail.toLowerCase() !== activeEmail : mine;
          return <div key={message.id} className={`max-w-[86%] rounded-2xl px-3 py-2 ${fromMe ? "ml-auto bg-gold text-black" : "mr-auto bg-[#193554] text-white"}`}><p className="whitespace-pre-wrap text-sm">{message.body}</p><p className="mt-1 flex justify-end gap-2 text-[10px] opacity-60"><span>{new Date(String(message.sentAt)).toLocaleString("pt-BR")}</span>{fromMe && <span className="font-semibold">{message.readAt ? "Lido" : "Enviado"}</span>}</p></div>;
        })}
        {!messages.isLoading && activeEmail && !messageList.length && <div className="m-auto text-center text-sm text-gray-500">Comece uma conversa com {activeContact?.name}.</div>}
        {!activeEmail && <div className="m-auto text-center text-sm text-gray-500">Nenhum contato disponível.</div>}
      </div>
      <div className="flex gap-2 border-t border-white/10 bg-[#0b1524] p-3">
        <Input value={body} onChange={event => setBody(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void submit(); }} disabled={!activeEmail} placeholder="Escreva uma mensagem" />
        <Button type="button" onClick={submit} disabled={!body.trim() || !activeEmail || send.isPending} className="bg-gold text-black"><Send size={17} /></Button>
      </div>
    </section>
  );
}
