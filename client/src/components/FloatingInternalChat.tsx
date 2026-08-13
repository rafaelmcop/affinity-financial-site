import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageCircle, Search, Send, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Props = { mode: "admin" | "agent" };
type Contact = { email: string; name: string };

export default function FloatingInternalChat({ mode }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("agentSession") || "{}");
    } catch {
      return {};
    }
  }, []);
  const myEmail = String(session.email || "").toLowerCase();
  const agents = trpc.crm.assignees.useQuery(undefined, { refetchInterval: 30000 });
  const unread = trpc.crm.internalUnreadCount.useQuery(
    { mode },
    { refetchInterval: 10000 }
  );
  const contacts = useMemo<Contact[]>(() => {
    const list = (Array.isArray(agents.data) ? agents.data : [])
      .filter(item =>
        ["agent", "both"].includes(String(item.accountType || "")) &&
        (mode === "admin" || item.email.toLowerCase() !== myEmail)
      )
      .map(item => ({ email: item.email.toLowerCase(), name: item.name }));
    return mode === "agent"
      ? [{ email: "__admin__", name: "Administração" }, ...list]
      : list;
  }, [agents.data, mode, myEmail]);
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

  useEffect(() => {
    if (!open || !activeEmail) return;
    markRead.mutate({ mode, agentEmail, peerEmail });
  }, [open, activeEmail, messageList.length]);

  useEffect(() => {
    if (!open) return;
    end.current?.scrollIntoView({ behavior: "smooth" });
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
        <div className="min-w-0 flex-1"><p className="font-bold">Mensagens internas</p><p className="truncate text-xs text-gray-400">{activeContact?.name || "Selecione um contato"}</p></div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-300 hover:bg-white/10" aria-label="Minimizar chat"><ChevronDown size={20} /></button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-300 hover:bg-white/10" aria-label="Fechar chat"><X size={19} /></button>
      </header>
      <div className="border-b border-white/10 p-3">
        <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" /><Input className="h-9 pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar contato" /></label>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {filteredContacts.map(contact => <button key={contact.email} type="button" onClick={() => setSelectedEmail(contact.email)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${activeEmail === contact.email ? "bg-gold text-black" : "bg-white/10 text-gray-200 hover:bg-white/15"}`}>{contact.name}</button>)}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-black/25 p-4">
        {messageList.map(message => {
          const mine = message.senderEmail.toLowerCase() === (mode === "agent" ? myEmail : String(message.senderEmail).toLowerCase() !== activeEmail ? String(message.senderEmail).toLowerCase() : "");
          const fromMe = mode === "admin" ? message.senderEmail.toLowerCase() !== activeEmail : mine;
          return <div key={message.id} className={`max-w-[86%] rounded-2xl px-3 py-2 ${fromMe ? "ml-auto bg-gold text-black" : "mr-auto bg-[#193554] text-white"}`}><p className="whitespace-pre-wrap text-sm">{message.body}</p><p className="mt-1 text-[10px] opacity-60">{new Date(String(message.sentAt)).toLocaleString("pt-BR")}</p></div>;
        })}
        {!messages.isLoading && activeEmail && !messageList.length && <div className="m-auto text-center text-sm text-gray-500">Comece uma conversa com {activeContact?.name}.</div>}
        {!activeEmail && <div className="m-auto text-center text-sm text-gray-500">Nenhum contato disponível.</div>}
        <div ref={end} />
      </div>
      <div className="flex gap-2 border-t border-white/10 bg-[#0b1524] p-3">
        <Input value={body} onChange={event => setBody(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void submit(); }} disabled={!activeEmail} placeholder="Escreva uma mensagem" />
        <Button type="button" onClick={submit} disabled={!body.trim() || !activeEmail || send.isPending} className="bg-gold text-black"><Send size={17} /></Button>
      </div>
    </section>
  );
}
