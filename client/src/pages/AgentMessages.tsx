import { useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Occasion = "birthday" | "christmas" | "new_year" | "custom";
type Audience = "individual" | "group" | "all";
type Form = {
  id?: number;
  title: string;
  subject: string;
  occasion: Occasion;
  audience: Audience;
  clientId?: number;
  recipientGroup: string;
  message: string;
  scheduledAt: string;
  isActive: boolean;
};
const empty: Form = {
  title: "",
  subject: "",
  occasion: "custom",
  audience: "individual",
  recipientGroup: "client",
  message: "Olá {nome},",
  scheduledAt: "",
  isActive: true,
};
const labels: Record<Occasion, string> = {
  birthday: "Aniversário",
  christmas: "Natal",
  new_year: "Ano-Novo",
  custom: "Data personalizada",
};

export function ScheduledMessagesPanel() {
  const messages = trpc.agent.listMessages.useQuery(),
    clients = trpc.agent.listClients.useQuery();
  const create = trpc.agent.scheduleMessage.useMutation(),
    update = trpc.agent.updateMessage.useMutation(),
    remove = trpc.agent.deleteMessage.useMutation();
  const [form, setForm] = useState<Form | null>(null);
  const save = async () => {
    if (!form?.title.trim() || !form.subject.trim() || !form.message.trim())
      return toast.error("Preencha título, assunto e mensagem");
    if (form.audience === "individual" && !form.clientId)
      return toast.error("Selecione um cliente");
    try {
      const payload = {
        ...form,
        channel: "email" as const,
        scheduledAt: form.scheduledAt
          ? new Date(form.scheduledAt).toISOString()
          : "",
      };
      form.id
        ? await update.mutateAsync({ ...payload, id: form.id })
        : await create.mutateAsync(payload);
      await messages.refetch();
      setForm(null);
      toast.success("Automação salva");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar"
      );
    }
  };
  const edit = (row: any) =>
    setForm({
      id: row.id,
      title: row.title || "Automação",
      subject: row.subject || row.title || "Mensagem da Affinity",
      occasion: row.occasion,
      audience: row.audience || (row.clientId ? "individual" : "all"),
      clientId: row.clientId || undefined,
      recipientGroup: row.recipientGroup || "client",
      message: row.message,
      scheduledAt: row.scheduledAt ? String(row.scheduledAt).slice(0, 16) : "",
      isActive: Boolean(row.isActive),
    });
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
            Automações do CRM
          </p>
          <h1 className="mt-2 text-3xl font-bold">Mensagens automáticas</h1>
          <p className="mt-2 text-sm text-gray-400">
            Enviadas às 8:30 AM pelo e-mail particular configurado no portal.
            Use <b>{"{nome}"}</b> para personalizar.
          </p>
        </div>
        <Button className="bg-gold text-black" onClick={() => setForm(empty)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova automação
        </Button>
      </div>
      {form && (
        <Card className="grid gap-4 border-gold/30 bg-[#0b1524] p-6 md:grid-cols-2">
          <Input
            placeholder="Nome da automação"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <Input
            placeholder="Assunto do e-mail"
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
          />
          <label className="text-sm text-gray-300">
            Ocasião
            <select
              className="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3"
              value={form.occasion}
              onChange={e =>
                setForm({ ...form, occasion: e.target.value as Occasion })
              }
            >
              <option value="birthday">Aniversário</option>
              <option value="christmas">Natal</option>
              <option value="new_year">Ano-Novo</option>
              <option value="custom">Data personalizada</option>
            </select>
          </label>
          <label className="text-sm text-gray-300">
            Destinatários
            <select
              className="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3"
              value={form.audience}
              onChange={e =>
                setForm({ ...form, audience: e.target.value as Audience })
              }
            >
              <option value="individual">Individual</option>
              <option value="group">Grupo</option>
              <option value="all">Coletiva — todos os clientes</option>
            </select>
          </label>
          {form.audience === "individual" && (
            <label className="text-sm text-gray-300 md:col-span-2">
              Cliente
              <select
                className="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3"
                value={form.clientId || ""}
                onChange={e =>
                  setForm({ ...form, clientId: Number(e.target.value) })
                }
              >
                <option value="">Selecione</option>
                {(clients.data || [])
                  .filter(c => c.email)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.email}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {form.audience === "group" && (
            <label className="text-sm text-gray-300 md:col-span-2">
              Grupo
              <select
                className="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3"
                value={form.recipientGroup}
                onChange={e =>
                  setForm({ ...form, recipientGroup: e.target.value })
                }
              >
                <option value="new">Novos</option>
                <option value="contacted">Contatados</option>
                <option value="meeting">Reunião</option>
                <option value="proposal">Proposta</option>
                <option value="client">Clientes</option>
                <option value="closed">Encerrados</option>
              </select>
            </label>
          )}
          {form.occasion === "custom" && (
            <label className="text-sm text-gray-300 md:col-span-2">
              Data do envio
              <Input
                className="mt-2"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e =>
                  setForm({ ...form, scheduledAt: e.target.value })
                }
              />
            </label>
          )}
          <textarea
            className="min-h-32 rounded-md border border-white/20 bg-black p-3 md:col-span-2"
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm({ ...form, isActive: e.target.checked })}
            />
            Automação ativa
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button className="bg-gold text-black" onClick={save}>
              Salvar automação
            </Button>
          </div>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {(messages.data || []).map(row => (
          <Card key={row.id} className="border-gold/20 bg-[#0b1524] p-5">
            <div className="flex justify-between gap-3">
              <div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${row.isActive ? "bg-green-500/15 text-green-300" : "bg-gray-500/20 text-gray-400"}`}
                >
                  {row.isActive ? "Ativa" : "Pausada"}
                </span>
                <h3 className="mt-3 text-lg font-bold text-gold">
                  {row.title || labels[row.occasion]}
                </h3>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={() => edit(row)}>
                  <Edit2 size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={async () => {
                    if (!window.confirm("Excluir esta automação?")) return;
                    await remove.mutateAsync({ id: row.id });
                    await messages.refetch();
                    toast.success("Automação excluída");
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs uppercase tracking-wider text-gray-500">
              {labels[row.occasion]} · E-mail ·{" "}
              {row.audience === "all"
                ? "Coletiva"
                : row.audience === "group"
                  ? "Grupo"
                  : "Individual"}
            </p>
            <p className="mt-3 text-sm font-semibold">
              {row.subject || row.title}
            </p>
            <p className="mt-2 line-clamp-3 text-sm text-gray-300">
              {row.message}
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
