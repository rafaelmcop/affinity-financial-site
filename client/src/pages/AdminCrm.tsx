import { useMemo, useState } from "react";
import {
  CalendarClock,
  Edit2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  Save,
  UserRound,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import AdminSidebar from "@/components/AdminSidebar";
import AgentSidebar from "@/components/AgentSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Status =
  | "new"
  | "contacted"
  | "meeting"
  | "proposal"
  | "client"
  | "closed";
type ClientForm = {
  id?: number;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  status: Status;
  source: string;
  assignedAdminEmail: string;
  nextFollowUpAt: string;
  notes: string;
};
const emptyClient: ClientForm = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  status: "new",
  source: "",
  assignedAdminEmail: "",
  nextFollowUpAt: "",
  notes: "",
};
const statuses: { value: Status; label: string; color: string }[] = [
  {
    value: "new",
    label: "Novo contato",
    color: "bg-blue-500/15 text-blue-300",
  },
  {
    value: "contacted",
    label: "Contatado",
    color: "bg-cyan-500/15 text-cyan-300",
  },
  {
    value: "meeting",
    label: "Reunião",
    color: "bg-purple-500/15 text-purple-300",
  },
  {
    value: "proposal",
    label: "Proposta",
    color: "bg-amber-500/15 text-amber-300",
  },
  {
    value: "client",
    label: "Cliente",
    color: "bg-green-500/15 text-green-300",
  },
  {
    value: "closed",
    label: "Encerrado",
    color: "bg-gray-500/15 text-gray-300",
  },
];

function localInput(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function digits(value: string) {
  return value.replace(/\D/g, "");
}
function displayDate(value: unknown) {
  return value
    ? new Date(String(value)).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Não agendado";
}

export default function AdminCrm({
  agentMode = false,
}: {
  agentMode?: boolean;
}) {
  const clientsQuery = trpc.crm.list.useQuery();
  const assigneesQuery = trpc.crm.assignees.useQuery();
  const createMutation = trpc.crm.create.useMutation();
  const updateMutation = trpc.crm.update.useMutation();
  const addActivity = trpc.crm.addActivity.useMutation();
  const [form, setForm] = useState<ClientForm>(emptyClient);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const activitiesQuery = trpc.crm.activities.useQuery(
    { clientId: selectedId || 0 },
    { enabled: !!selectedId }
  );
  const policiesQuery = trpc.agent.listPolicies.useQuery(undefined, {
    enabled: agentMode,
  });
  const messagesQuery = trpc.agent.listMessages.useQuery(undefined, {
    enabled: agentMode,
  });
  const tasksQuery = trpc.agent.listTasks.useQuery(undefined, {
    enabled: agentMode,
  });
  const [channel, setChannel] = useState<"email" | "sms" | "whatsapp">(
    "whatsapp"
  );
  const [communication, setCommunication] = useState("");
  const clients = clientsQuery.data || [];
  const selected = clients.find(client => client.id === selectedId);
  const selectedPolicies = (policiesQuery.data || []).filter(
    policy =>
      policy.clientId === selectedId ||
      (!!selected?.email &&
        policy.clientEmail?.toLowerCase() === selected.email.toLowerCase())
  );
  const selectedMessages = (messagesQuery.data || []).filter(
    message => message.clientId === selectedId && message.isActive
  );
  const selectedTasks = (tasksQuery.data || []).filter(
    task => task.clientId === selectedId && task.status === "pending"
  );
  const storedSession = (() => {
    try {
      return JSON.parse(
        localStorage.getItem(agentMode ? "agentSession" : "adminSession") ||
          "{}"
      );
    } catch {
      return {};
    }
  })();
  const currentAdmin = assigneesQuery.data?.find(
    admin =>
      admin.email.toLowerCase() ===
      String(storedSession.email || "").toLowerCase()
  );
  const filtered = useMemo(
    () =>
      clients.filter(client =>
        `${client.name} ${client.email || ""} ${client.phone || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [clients, search]
  );

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      ...form,
      nextFollowUpAt: form.nextFollowUpAt
        ? new Date(form.nextFollowUpAt).toISOString()
        : "",
    };
    try {
      if (form.id)
        await updateMutation.mutateAsync({ ...payload, id: form.id });
      else await createMutation.mutateAsync(payload);
      await clientsQuery.refetch();
      setForm(emptyClient);
      setShowForm(false);
      toast.success(
        form.id ? "Cliente atualizado" : "Cliente adicionado ao CRM"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar"
      );
    }
  };
  const edit = (client: (typeof clients)[number]) => {
    setForm({
      id: client.id,
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      whatsapp: client.whatsapp || "",
      status: client.status,
      source: client.source || "",
      assignedAdminEmail: client.assignedAdminEmail || "",
      nextFollowUpAt: localInput(client.nextFollowUpAt),
      notes: client.notes || "",
    });
    setShowForm(true);
  };
  const register = async (
    type: "note" | "call" | "email" | "sms" | "whatsapp",
    content: string
  ) => {
    if (!selected) return;
    try {
      await addActivity.mutateAsync({ clientId: selected.id, type, content });
      await activitiesQuery.refetch();
    } catch {
      toast.error("Não foi possível registrar a ação");
    }
  };
  const message = selected
    ? `Olá ${selected.name}, tudo bem? Aqui é da Affinity Financial. Estou entrando em contato para dar continuidade ao seu atendimento.`
    : "";
  const openAction = (type: "call" | "email" | "sms" | "whatsapp") => {
    if (!selected) return;
    let url = "";
    if (type === "email") {
      if (!selected.email) return toast.error("Este cliente não possui e-mail");
      url = `mailto:${selected.email}?subject=${encodeURIComponent("Acompanhamento - Affinity Financial")}&body=${encodeURIComponent(message)}`;
    }
    if (type === "whatsapp") {
      const number = digits(selected.whatsapp || selected.phone || "");
      if (!number) return toast.error("Este cliente não possui WhatsApp");
      url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    }
    if (type === "sms") {
      const number = digits(selected.phone || selected.whatsapp || "");
      if (!number) return toast.error("Este cliente não possui telefone");
      url = `sms:${number}?body=${encodeURIComponent(message)}`;
    }
    if (type === "call") {
      const number = digits(selected.phone || selected.whatsapp || "");
      if (!number) return toast.error("Este cliente não possui telefone");
      url = `tel:${number}`;
    }
    void register(
      type,
      type === "call"
        ? "Ligação iniciada pelo CRM"
        : `${type.toUpperCase()} preparado pelo CRM`
    );
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      {agentMode ? <AgentSidebar /> : <AdminSidebar />}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.2em] text-gold">
              Relacionamento
            </p>
            <h1 className="mt-2 text-3xl font-bold">CRM de clientes</h1>
            <p className="mt-2 text-gray-400">
              Organize contatos, próximos passos e todo o histórico de
              acompanhamento.
            </p>
          </div>
          <Button
            onClick={() => {
              setForm(emptyClient);
              setShowForm(!showForm);
            }}
            className="bg-gold text-black"
          >
            <Plus size={17} className="mr-2" />
            Novo cliente
          </Button>
        </div>
        <Card className="border-gold/20 bg-[#0b1524] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Buscar por nome, e-mail ou telefone"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300">
              Seu envio:{" "}
              <strong className="text-white">
                {currentAdmin?.contactEmail ||
                  currentAdmin?.email ||
                  "e-mail não configurado"}
              </strong>{" "}
              · WhatsApp:{" "}
              <strong className="text-white">
                {currentAdmin?.whatsapp || "não configurado"}
              </strong>
            </div>
          </div>
        </Card>
        {showForm && (
          <Card className="border-gold/30 bg-[#101b2b] p-6">
            <h2 className="mb-4 text-xl font-bold text-gold">
              {form.id ? "Editar cliente" : "Adicionar cliente"}
            </h2>
            <form
              onSubmit={save}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              <Input
                placeholder="Nome do cliente"
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
                type="tel"
                placeholder="Telefone / SMS"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                type="tel"
                placeholder="WhatsApp"
                value={form.whatsapp}
                onChange={e => setForm({ ...form, whatsapp: e.target.value })}
              />
              <Input
                placeholder="Origem do contato"
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
              />
              <select
                value={form.status}
                onChange={e =>
                  setForm({ ...form, status: e.target.value as Status })
                }
                className="h-10 rounded-md border border-white/20 bg-black px-3"
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <select
                value={form.assignedAdminEmail}
                onChange={e =>
                  setForm({ ...form, assignedAdminEmail: e.target.value })
                }
                className="h-10 rounded-md border border-white/20 bg-black px-3"
              >
                <option value="">Sem responsável</option>
                {(assigneesQuery.data || [])
                  .filter(admin => admin.isActive)
                  .map(admin => (
                    <option key={admin.id} value={admin.email}>
                      {admin.name}
                    </option>
                  ))}
              </select>
              <Input
                type="datetime-local"
                value={form.nextFollowUpAt}
                onChange={e =>
                  setForm({ ...form, nextFollowUpAt: e.target.value })
                }
              />
              <textarea
                placeholder="Observações gerais"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="min-h-24 rounded-md border border-white/20 bg-black p-3 text-sm lg:col-span-3"
              />
              <div className="flex gap-3 lg:col-span-3">
                <Button type="submit" className="bg-gold text-black">
                  <Save size={16} className="mr-2" />
                  Salvar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-3">
            {filtered.length === 0 && (
              <Card className="border-white/10 bg-[#0b1524] p-8 text-center text-gray-400">
                Nenhum cliente encontrado.
              </Card>
            )}
            {filtered.map(client => {
              const status = statuses.find(
                item => item.value === client.status
              )!;
              const overdue =
                client.nextFollowUpAt &&
                new Date(String(client.nextFollowUpAt)).getTime() <
                  Date.now() &&
                client.status !== "closed";
              return (
                <Card
                  key={client.id}
                  className={`cursor-pointer border bg-[#0b1524] p-5 transition ${selectedId === client.id ? "border-gold" : "border-white/10 hover:border-gold/50"}`}
                  onClick={() => setSelectedId(client.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{client.name}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {client.email || "Sem e-mail"} ·{" "}
                        {client.phone || client.whatsapp || "Sem telefone"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        edit(client);
                      }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                    >
                      <Edit2 size={17} />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${status.color}`}
                    >
                      {status.label}
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${overdue ? "bg-red-500/15 text-red-300" : "bg-white/5 text-gray-300"}`}
                    >
                      <CalendarClock size={13} />
                      {displayDate(client.nextFollowUpAt)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <UserRound size={13} />
                      {client.assignedAdminEmail || "Sem responsável"}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
          <Card className="h-fit border-gold/20 bg-[#0b1524] p-5 lg:sticky lg:top-6">
            {!selected ? (
              <div className="py-12 text-center text-gray-400">
                <UserRound className="mx-auto mb-3" />
                Selecione um cliente para abrir o acompanhamento.
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gold">{selected.name}</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Cadastro, apólice, automações e histórico em um só lugar
                </p>
                {agentMode && (
                  <>
                    <div className="mt-5 space-y-2">
                      {selectedPolicies.map(policy => (
                        <div
                          key={policy.id}
                          className="rounded-lg border border-gold/20 bg-black/35 p-3"
                        >
                          <p className="font-semibold">
                            Apólice {policy.policyNumber}
                          </p>
                          <p className="mt-1 text-xs text-gray-300">
                            {policy.product || "Produto não informado"} ·
                            Premium $
                            {Number(policy.premiumAmount || 0).toFixed(2)}{" "}
                            {policy.premiumFrequency || ""}
                          </p>
                          <p className="mt-1 text-xs text-gray-300">
                            Cobertura $
                            {Number(
                              policy.coverageAmount || 0
                            ).toLocaleString()}{" "}
                            · Beneficiário:{" "}
                            {policy.beneficiaries || "não informado"}
                          </p>
                        </div>
                      ))}
                      {selectedPolicies.length === 0 && (
                        <p className="rounded-lg bg-white/5 p-3 text-xs text-gray-400">
                          Nenhuma apólice vinculada.
                        </p>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-green-500/10 p-3 text-green-200">
                        <b>{selectedMessages.length}</b>
                        <br />
                        mensagens programadas
                      </div>
                      <div className="rounded-lg bg-amber-500/10 p-3 text-amber-200">
                        <b>{selectedTasks.length}</b>
                        <br />
                        acompanhamentos pendentes
                      </div>
                    </div>
                  </>
                )}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openAction("whatsapp")}
                  >
                    <MessageCircle size={16} className="mr-2" />
                    WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => openAction("sms")}>
                    <MessageSquare size={16} className="mr-2" />
                    SMS
                  </Button>
                  <Button variant="outline" onClick={() => openAction("email")}>
                    <Mail size={16} className="mr-2" />
                    E-mail
                  </Button>
                  <Button variant="outline" onClick={() => openAction("call")}>
                    <Phone size={16} className="mr-2" />
                    Ligar
                  </Button>
                </div>
                {agentMode && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="flex gap-2">
                      <select
                        value={channel}
                        onChange={e =>
                          setChannel(e.target.value as typeof channel)
                        }
                        className="h-10 rounded-md border border-white/20 bg-black px-3 text-sm"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                        <option value="email">E-mail</option>
                      </select>
                  <span className="flex items-center text-xs text-green-300">
                    A ação será salva no histórico
                  </span>
                    </div>
                    <textarea
                      value={communication}
                      onChange={e => setCommunication(e.target.value)}
                      placeholder="Escreva a mensagem ou cole o conteúdo enviado"
                      className="mt-3 min-h-24 w-full rounded-md border border-white/20 bg-black p-3 text-sm"
                    />
                    <Button
                      className="mt-2 w-full bg-gold text-black"
                      onClick={async () => {
                        if (!communication.trim()) return;
                        await register(channel, communication.trim());
                        setCommunication("");
                        toast.success("Interação salva no histórico");
                      }}
                    >
                      Salvar interação
                    </Button>
                  </div>
                )}
                <p className="mt-3 rounded-lg bg-black/40 p-3 text-xs leading-relaxed text-gray-300">
                  {message}
                </p>
                <div className="mt-5 flex gap-2">
                  <Input
                    placeholder="Registrar observação"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                  <Button
                    onClick={async () => {
                      if (!note.trim()) return;
                      await register("note", note.trim());
                      setNote("");
                    }}
                    className="bg-gold text-black"
                  >
                    Salvar
                  </Button>
                </div>
                <div className="mt-5 max-h-72 space-y-3 overflow-y-auto">
                  {(activitiesQuery.data || []).map(activity => (
                    <div
                      key={activity.id}
                      className="border-l-2 border-gold/40 pl-3"
                    >
                      <p className="text-sm text-white">{activity.content}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {activity.type.toUpperCase()} · {activity.createdBy} ·{" "}
                        {displayDate(activity.createdAt)}
                      </p>
                    </div>
                  ))}
                  {activitiesQuery.data?.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Ainda não há ações registradas.
                    </p>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
