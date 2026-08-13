import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  MessageCircle,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Contact = { email: string; name: string; administration?: boolean };

export default function AgentInternalMessages() {
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("__admin__");
  const session = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("agentSession") || "{}");
    } catch {
      return {};
    }
  }, []);
  const myEmail = String(session.email || "").toLowerCase();
  const agents = trpc.crm.assignees.useQuery();
  const peerEmail = selectedEmail === "__admin__" ? undefined : selectedEmail;
  const messages = trpc.crm.internalMessages.useQuery(
    { mode: "agent", peerEmail },
    { refetchInterval: 10000 }
  );
  const send = trpc.crm.sendInternalMessage.useMutation();
  const markRead = trpc.crm.markInternalMessagesRead.useMutation();
  const utils = trpc.useUtils();
  const end = useRef<HTMLDivElement>(null);
  const contacts = useMemo<Contact[]>(() => {
    const agentContacts = (agents.data || [])
      .filter(
        item =>
          ["agent", "both"].includes(String(item.accountType || "")) &&
          item.email.toLowerCase() !== myEmail
      )
      .map(item => ({ email: item.email.toLowerCase(), name: item.name }));
    return [
      { email: "__admin__", name: "Administração", administration: true },
      ...agentContacts,
    ];
  }, [agents.data, myEmail]);
  const selected = contacts.find(contact => contact.email === selectedEmail);
  const filteredContacts = contacts.filter(contact =>
    `${contact.name} ${contact.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedEmail) return;
    markRead.mutate({ mode: "agent", peerEmail });
  }, [selectedEmail, messages.data?.length]);
  useEffect(
    () => end.current?.scrollIntoView({ behavior: "smooth" }),
    [messages.data?.length, selectedEmail]
  );

  const submit = async () => {
    if (!body.trim()) return;
    try {
      await send.mutateAsync({ mode: "agent", peerEmail, body: body.trim() });
      setBody("");
      await messages.refetch();
      await utils.crm.internalUnreadCount.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível enviar"
      );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AgentSidebar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
            Canal interno
          </p>
          <h1 className="mt-2 text-3xl font-bold">Mensagens da equipe</h1>
          <p className="mt-2 text-gray-400">
            Converse com a administração ou com outro agente sem sair do portal.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
          <Card className="h-fit border-gold/20 bg-[#0b1524] p-3">
            <label className="relative block">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <Input
                className="pl-9"
                placeholder="Buscar contato"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </label>
            <div className="mt-3 space-y-1">
              {filteredContacts.map(contact => (
                <button
                  key={contact.email}
                  onClick={() => setSelectedEmail(contact.email)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selectedEmail === contact.email ? "bg-gold font-bold text-black" : "text-gray-200 hover:bg-white/10"}`}
                >
                  {contact.administration ? (
                    <Building2 size={18} />
                  ) : (
                    <UserRound size={18} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {contact.name}
                    </span>
                    {!contact.administration && (
                      <span className="block truncate text-xs opacity-60">
                        {contact.email}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="border-gold/20 bg-[#0b1524] p-5">
            <h2 className="flex items-center gap-2 font-bold text-gold">
              <MessageCircle size={19} /> Conversa com{" "}
              {selected?.name || "contato"}
            </h2>
            <div className="mt-4 flex max-h-[34rem] min-h-[28rem] flex-col gap-3 overflow-y-auto rounded-xl bg-black/35 p-4">
              {(messages.data || []).map(message => {
                const mine = message.senderEmail.toLowerCase() === myEmail;
                return (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl p-3 ${mine ? "ml-auto bg-gold text-black" : "mr-auto bg-sky-500/15 text-white"}`}
                  >
                    <p className="text-xs font-bold">
                      {mine ? "Você" : selected?.name}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {message.body}
                    </p>
                    <p className="mt-1 text-[10px] opacity-60">
                      {new Date(String(message.sentAt)).toLocaleString("pt-BR")}
                    </p>
                  </div>
                );
              })}
              {!messages.isLoading && !messages.data?.length && (
                <div className="m-auto text-center text-gray-500">
                  <MessageCircle className="mx-auto mb-3" />
                  Nenhuma mensagem nesta conversa.
                </div>
              )}
              {messages.isError && (
                <div className="m-auto text-center text-red-300">
                  Não foi possível carregar esta conversa. Tente atualizar a
                  página.
                </div>
              )}
              <div ref={end} />
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={body}
                onChange={event => setBody(event.target.value)}
                placeholder={`Mensagem para ${selected?.name || "o contato"}`}
                onKeyDown={event => {
                  if (event.key === "Enter") void submit();
                }}
              />
              <Button
                className="bg-gold text-black"
                disabled={!body.trim() || send.isPending || messages.isError}
                onClick={submit}
              >
                <Send size={16} />
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
