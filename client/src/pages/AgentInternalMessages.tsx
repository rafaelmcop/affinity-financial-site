import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AgentInternalMessages() {
  const [body, setBody] = useState("");
  const messages = trpc.crm.internalMessages.useQuery({ mode: "agent" }, { refetchInterval: 15000 });
  const send = trpc.crm.sendInternalMessage.useMutation();
  const markRead = trpc.crm.markInternalMessagesRead.useMutation();
  const end = useRef<HTMLDivElement>(null);
  const session = (() => { try { return JSON.parse(localStorage.getItem("agentSession") || "{}"); } catch { return {}; } })();
  useEffect(() => { markRead.mutate({ mode: "agent" }); }, [messages.data?.length]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [messages.data?.length]);
  const submit = async () => {
    if (!body.trim()) return;
    try {
      await send.mutateAsync({ mode: "agent", body: body.trim() });
      setBody("");
      await messages.refetch();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível enviar"); }
  };
  return <div className="min-h-screen bg-black text-white lg:pl-64"><AgentSidebar /><main className="mx-auto max-w-4xl px-4 py-8"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-gold">Canal interno</p><h1 className="mt-2 text-3xl font-bold">Falar com a administração</h1><p className="mt-2 text-gray-400">Conversa privada e registrada entre você e os administradores.</p></div><Card className="mt-6 border-gold/20 bg-[#0b1524] p-5"><div className="flex max-h-[34rem] min-h-[26rem] flex-col gap-3 overflow-y-auto rounded-xl bg-black/35 p-4">{(messages.data || []).map(message => { const mine = message.senderEmail.toLowerCase() === String(session.email || "").toLowerCase(); return <div key={message.id} className={`max-w-[85%] rounded-2xl p-3 ${mine ? 'ml-auto bg-gold text-black' : 'mr-auto bg-sky-500/15 text-white'}`}><p className="text-xs font-bold">{mine ? 'Você' : 'Administração'}</p><p className="mt-1 whitespace-pre-wrap text-sm">{message.body}</p><p className="mt-1 text-[10px] opacity-60">{new Date(String(message.sentAt)).toLocaleString('pt-BR')}</p></div>})}{!messages.data?.length && <div className="m-auto text-center text-gray-500"><MessageCircle className="mx-auto mb-3" />Nenhuma mensagem ainda.</div>}<div ref={end}/></div><div className="mt-3 flex gap-2"><Input value={body} onChange={e => setBody(e.target.value)} placeholder="Escreva para a administração" onKeyDown={e => { if (e.key === 'Enter') void submit(); }}/><Button className="bg-gold text-black" disabled={!body.trim() || send.isPending} onClick={submit}><Send size={16}/></Button></div></Card></main></div>;
}
