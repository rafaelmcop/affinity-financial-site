import { useState } from "react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function ScheduledMessagesPanel() {
  const messages = trpc.agent.listMessages.useQuery();
  const create = trpc.agent.scheduleMessage.useMutation();
  const [form, setForm] = useState({
    occasion: "birthday" as "birthday" | "christmas" | "new_year" | "custom",
    channel: "email" as "email" | "sms" | "whatsapp",
    message:
      "Feliz aniversário! A Affinity Financial deseja um dia muito especial para você.",
    scheduledAt: "",
  });

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
          Automações do CRM
        </p>
        <h2 className="mt-2 text-2xl font-bold">Mensagens programadas</h2>
        <p className="mt-2 text-sm text-gray-400">
          Prepare aniversários, datas especiais e acompanhamentos sem sair do
          CRM.
        </p>
      </div>
      <Card className="grid gap-4 border-gold/20 bg-[#0b1524] p-6 md:grid-cols-2">
        <select
          className="h-10 rounded-md border border-white/20 bg-black px-3"
          value={form.occasion}
          onChange={event =>
            setForm({
              ...form,
              occasion: event.target.value as typeof form.occasion,
            })
          }
        >
          <option value="birthday">Aniversário</option>
          <option value="christmas">Natal</option>
          <option value="new_year">Ano Novo</option>
          <option value="custom">Data personalizada</option>
        </select>
        <select
          className="h-10 rounded-md border border-white/20 bg-black px-3"
          value={form.channel}
          onChange={event =>
            setForm({
              ...form,
              channel: event.target.value as typeof form.channel,
            })
          }
        >
          <option value="email">E-mail</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <Input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={event =>
            setForm({ ...form, scheduledAt: event.target.value })
          }
        />
        <textarea
          className="min-h-28 rounded-md border border-white/20 bg-black p-3 md:col-span-2"
          value={form.message}
          onChange={event => setForm({ ...form, message: event.target.value })}
        />
        <Button
          className="bg-gold text-black md:col-span-2"
          onClick={async () => {
            await create.mutateAsync({
              ...form,
              scheduledAt: form.scheduledAt
                ? new Date(form.scheduledAt).toISOString()
                : "",
            });
            await messages.refetch();
            toast.success("Mensagem programada como rascunho");
          }}
        >
          Programar mensagem
        </Button>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {(messages.data || []).map(message => (
          <Card key={message.id} className="border-white/10 bg-[#0b1524] p-4">
            <p className="font-bold">
              {message.occasion} · {message.channel}
            </p>
            <p className="mt-2 text-sm text-gray-300">{message.message}</p>
            <p className="mt-2 text-xs text-amber-300">
              Aguardando conexão do serviço de envio
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function AgentMessages() {
  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AgentSidebar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <ScheduledMessagesPanel />
      </main>
    </div>
  );
}
