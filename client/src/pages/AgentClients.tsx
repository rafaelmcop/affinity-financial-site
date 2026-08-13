import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Edit2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Status =
  | "new"
  | "contacted"
  | "meeting"
  | "proposal"
  | "client"
  | "closed";
type Form = {
  id?: number;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  birthDate: string;
  status: Status;
  source: string;
  notes: string;
};
const empty: Form = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  birthDate: "",
  status: "client",
  source: "Cadastro manual",
  notes: "",
};
const isoDate = (value: unknown) => (value ? String(value).slice(0, 10) : "");
const chatBody = (value: unknown) =>
  String(value || "")
    .split(/\r?\n(?=(?:Sent from my (?:iPhone|iPad)|On .+ wrote:|Em .+ escreveu:|>))/i)[0]
    .replace(/\r?\n>[\s\S]*$/gi, "")
    .trim();

export default function AgentClients() {
  const [search, setSearch] = useState(""),
    [selectedId, setSelectedId] = useState<number | null>(null),
    [form, setForm] = useState<Form | null>(null),
    [emailSubject, setEmailSubject] = useState(""),
    [emailBody, setEmailBody] = useState("");
  const clients = trpc.agent.listClients.useQuery(),
    policies = trpc.agent.listPolicies.useQuery();
  const saveClient = trpc.agent.saveClient.useMutation(),
    remove = trpc.agent.deleteClient.useMutation();
  const emails = trpc.agent.clientEmails.useQuery(
      { clientId: selectedId || 0 },
      { enabled: Boolean(selectedId), refetchInterval: 15000 }
    ),
    sendEmail = trpc.agent.sendClientEmail.useMutation(),
    syncInbox = trpc.agent.syncInbox.useMutation(),
    markRead = trpc.agent.markClientEmailsRead.useMutation();
  const conversationEnd = useRef<HTMLDivElement>(null);
  const rows = clients.data || [],
    selected = rows.find(client => client.id === selectedId);
  const filtered = useMemo(
    () =>
      rows.filter(client =>
        `${client.name} ${client.email || ""} ${client.phone || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [rows, search]
  );
  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("cliente"));
    if (requested && rows.some(client => client.id === requested)) setSelectedId(requested);
  }, [rows]);
  useEffect(() => {
    if (!selectedId) return;
    markRead.mutate({ clientId: selectedId });
  }, [selectedId]);
  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [emails.data?.length, selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const refresh = async () => {
      if (syncInbox.isPending) return;
      try {
        await syncInbox.mutateAsync();
        if (active) await emails.refetch();
      } catch {
        // The manual button presents connection details; background refresh stays quiet.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedId]);
  const edit = (client: any) =>
    setForm({
      id: client.id,
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      whatsapp: client.whatsapp || "",
      birthDate: isoDate(client.birthDate),
      status: client.status,
      source: client.source || "Cadastro manual",
      notes: client.notes || "",
    });
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    try {
      await saveClient.mutateAsync(form);
      await clients.refetch();
      setForm(null);
      toast.success(form.id ? "Cliente atualizado" : "Cliente adicionado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar"
      );
    }
  };
  const deleteClient = async (id: number) => {
    if (
      !window.confirm(
        "Excluir este cliente? Esta ação não poderá ser desfeita."
      )
    )
      return;
    try {
      await remove.mutateAsync({ id });
      await clients.refetch();
      setSelectedId(null);
      toast.success("Cliente excluído");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível excluir"
      );
    }
  };
  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AgentSidebar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
              Carteira
            </p>
            <h1 className="mt-2 text-3xl font-bold">Clientes</h1>
            <p className="mt-2 text-gray-400">
              Cadastre, consulte e mantenha sua carteira atualizada.
            </p>
          </div>
          <Button className="bg-gold text-black" onClick={() => setForm(empty)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar cliente
          </Button>
        </div>
        {form && (
          <Card className="border-gold/30 bg-[#0b1524] p-6">
            <div className="mb-5 flex justify-between">
              <h2 className="text-xl font-bold text-gold">
                {form.id ? "Alterar cliente" : "Novo cliente"}
              </h2>
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancelar
              </Button>
            </div>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
              <Input
                placeholder="Nome completo"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Telefone"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                placeholder="WhatsApp"
                value={form.whatsapp}
                onChange={e => setForm({ ...form, whatsapp: e.target.value })}
              />
              <label className="text-sm text-gray-300">
                Data de nascimento
                <Input
                  className="mt-2"
                  type="date"
                  value={form.birthDate}
                  onChange={e =>
                    setForm({ ...form, birthDate: e.target.value })
                  }
                />
              </label>
              <label className="text-sm text-gray-300">
                Grupo
                <select
                  className="mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3"
                  value={form.status}
                  onChange={e =>
                    setForm({ ...form, status: e.target.value as Status })
                  }
                >
                  <option value="new">Novo</option>
                  <option value="contacted">Contatado</option>
                  <option value="meeting">Reunião</option>
                  <option value="proposal">Proposta</option>
                  <option value="client">Cliente</option>
                  <option value="closed">Encerrado</option>
                </select>
              </label>
              <textarea
                className="min-h-24 rounded-md border border-white/20 bg-black p-3 md:col-span-2"
                placeholder="Observações"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
              <Button className="bg-gold text-black md:col-span-2">
                Salvar cliente
              </Button>
            </form>
          </Card>
        )}
        {!selected ? (
          <>
            <Card className="border-gold/20 bg-[#0b1524] p-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-3 text-gray-500"
                  size={17}
                />
                <Input
                  className="pl-10"
                  placeholder="Buscar cliente"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </Card>
            <Card className="overflow-hidden border-gold/20 bg-[#0b1524]">
              {filtered.map(client => (
                <div
                  key={client.id}
                  className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    onClick={() => setSelectedId(client.id)}
                    className="flex-1 text-left"
                  >
                    <p className="font-semibold">{client.name}</p>
                    <p className="text-sm text-gray-400">
                      {client.email || "Sem e-mail"} ·{" "}
                      {client.phone || "Sem telefone"}
                    </p>
                  </button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => edit(client)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Alterar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => deleteClient(client.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
              {!filtered.length && (
                <p className="p-10 text-center text-gray-500">
                  Nenhum cliente encontrado.
                </p>
              )}
            </Card>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button variant="outline" onClick={() => edit(selected)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Alterar
              </Button>
              <Button
                variant="outline"
                onClick={() => deleteClient(selected.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </div>
            <Card className="border-gold/20 bg-[#0b1524] p-6">
              <h2 className="text-2xl font-bold">{selected.name}</h2>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  E-mail: <b>{selected.email || "Não informado"}</b>
                </p>
                <p>
                  Telefone: <b>{selected.phone || "Não informado"}</b>
                </p>
                <p>
                  Nascimento:{" "}
                  <b>{isoDate(selected.birthDate) || "Não informado"}</b>
                </p>
                <p>
                  Grupo: <b>{selected.status}</b>
                </p>
              </div>
              <p className="mt-4 rounded-lg bg-black/30 p-3 text-gray-300">
                {selected.notes || "Sem observações."}
              </p>
            </Card>
            <Card className="border-gold/20 bg-[#0b1524] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-gold">
                    <Mail size={20} /> Conversa por e-mail
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Envie e acompanhe as respostas do iCloud sem sair do portal.
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={syncInbox.isPending}
                  onClick={async () => {
                    try {
                      const result = await syncInbox.mutateAsync();
                      await emails.refetch();
                      toast.success(
                        result.imported
                          ? `${result.imported} resposta(s) sincronizada(s)`
                          : "Caixa de entrada atualizada"
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Não foi possível sincronizar"
                      );
                    }
                  }}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${syncInbox.isPending ? "animate-spin" : ""}`}
                  />
                  Atualizar respostas
                </Button>
              </div>
              <div className="mt-5 flex max-h-[34rem] min-h-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#050b13] p-4 sm:p-5">
                {(emails.data || []).map(message => (
                  <div
                    key={message.id}
                    className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${message.direction === "sent" ? "ml-auto rounded-br-sm bg-gold text-black" : "mr-auto rounded-bl-sm bg-[#17395c] text-white"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={`text-xs font-bold ${message.direction === "sent" ? "text-black/65" : "text-sky-200"}`}>
                        {message.direction === "sent" ? "Você" : selected.name}
                      </p>
                      <p className={`text-xs ${message.direction === "sent" ? "text-black/55" : "text-white/55"}`}>
                        {new Date(String(message.sentAt)).toLocaleString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                    <p className={`mt-2 text-xs font-semibold ${message.direction === "sent" ? "text-black/60" : "text-white/60"}`}>{message.subject}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {chatBody(message.body)}
                    </p>
                  </div>
                ))}
                {!emails.data?.length && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    Nenhum e-mail registrado para este cliente.
                  </p>
                )}
                <div ref={conversationEnd} />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
                <textarea
                  className="min-h-24 w-full resize-none border-0 bg-transparent p-2 text-white outline-none"
                  placeholder={`Mensagem para ${selected.name}`}
                  value={emailBody}
                  onChange={event => setEmailBody(event.target.value)}
                />
                <div className="flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  {!emails.data?.length && <Input
                    className="h-9 max-w-sm border-white/10 bg-black/20 text-sm"
                    placeholder="Assunto da nova conversa (opcional)"
                    value={emailSubject}
                    onChange={event => setEmailSubject(event.target.value)}
                  />}
                <Button
                  className="bg-gold px-7 text-black"
                  disabled={
                    !selected.email || !emailBody.trim() || sendEmail.isPending
                  }
                  onClick={async () => {
                    try {
                      await sendEmail.mutateAsync({
                        clientId: selected.id,
                        subject:
                          emailSubject.trim() ||
                          "Mensagem da Affinity Financial",
                        body: emailBody,
                      });
                      setEmailSubject("");
                      setEmailBody("");
                      await emails.refetch();
                      toast.success("E-mail enviado e salvo no histórico");
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Não foi possível enviar"
                      );
                    }
                  }}
                >
                  <Send className="mr-2 h-4 w-4" /> Enviar e-mail
                </Button>
                </div>
                {!selected.email && (
                  <p className="text-center text-xs text-amber-300">
                    Cadastre um e-mail válido para este cliente antes de enviar.
                  </p>
                )}
              </div>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              {(policies.data || [])
                .filter(p => p.clientId === selected.id)
                .map(policy => (
                  <Card
                    key={policy.id}
                    className="border-gold/20 bg-[#0b1524] p-5"
                  >
                    <ShieldCheck className="text-gold" />
                    <h3 className="mt-3 text-xl font-bold">
                      {policy.policyNumber}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                      {policy.product || "Produto não informado"}
                    </p>
                  </Card>
                ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
