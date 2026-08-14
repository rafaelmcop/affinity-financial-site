import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Edit2,
  FileSpreadsheet,
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
import { missingClientProfileFields } from "../../../shared/clientProfile";
import { readClientSpreadsheet } from "./AgentPolicies";

type Status =
  | "new"
  | "contacted"
  | "meeting"
  | "proposal"
  | "client"
  | "closed";
type SortKey = "name" | "date" | "type" | "coverage" | "premium";
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
type PolicyEditForm = {
  id: number;
  status: "active" | "lapse" | "declined" | "cancelled";
  product: string;
  issuedAt: string;
  premiumAmount: number;
  premiumFrequency: string;
  targetPremium: number;
  points: number;
  coverageAmount: number;
  beneficiaries: string;
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
const displayDate = (value: unknown) => {
  const date = isoDate(value);
  if (!date) return "Não informado";
  const [year, month, day] = date.split("-");
  return year && month && day ? `${month}/${day}/${year}` : date;
};
const currency = (value: unknown) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
const statusLabels: Record<Status, string> = {
  new: "Novo",
  contacted: "Contatado",
  meeting: "Reunião",
  proposal: "Proposta",
  client: "Cliente",
  closed: "Encerrado",
};
const MissingBadge = () => (
  <span className="ml-2 inline-flex rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
    Faltando
  </span>
);
const chatBody = (value: unknown) =>
  String(value || "")
    .split(
      /\r?\n(?=(?:Sent from my (?:iPhone|iPad)|On .+ wrote:|Em .+ escreveu:|>))/i
    )[0]
    .replace(/\r?\n>[\s\S]*$/gi, "")
    .trim();

export default function AgentClients() {
  const [search, setSearch] = useState(""),
    [sortKey, setSortKey] = useState<SortKey>("name"),
    [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"),
    [selectedId, setSelectedId] = useState<number | null>(null),
    [form, setForm] = useState<Form | null>(null),
    [policyForm, setPolicyForm] = useState<PolicyEditForm | null>(null),
    [emailSubject, setEmailSubject] = useState(""),
    [emailBody, setEmailBody] = useState("");
  const clients = trpc.agent.listClients.useQuery(),
    policies = trpc.agent.listPolicies.useQuery();
  const saveClient = trpc.agent.saveClient.useMutation(),
    remove = trpc.agent.deleteClient.useMutation(),
    updatePolicy = trpc.agent.updatePolicyDetails.useMutation(),
    importSpreadsheet = trpc.agent.importSpreadsheet.useMutation();
  const emails = trpc.agent.clientEmails.useQuery(
      { clientId: selectedId || 0 },
      { enabled: Boolean(selectedId), refetchInterval: 15000 }
    ),
    sendEmail = trpc.agent.sendClientEmail.useMutation(),
    syncInbox = trpc.agent.syncInbox.useMutation(),
    markRead = trpc.agent.markClientEmailsRead.useMutation();
  const conversationEnd = useRef<HTMLDivElement>(null);
  const conversationContainer = useRef<HTMLDivElement>(null);
  const spreadsheetInput = useRef<HTMLInputElement>(null);
  const rows = clients.data || [],
    selected = rows.find(client => client.id === selectedId),
    selectedPolicies = (policies.data || []).filter(
      policy => Number(policy.clientId) === selectedId
    ),
    primaryPolicy = selectedPolicies[0],
    missingFields = selected
      ? missingClientProfileFields(selected, selectedPolicies)
      : [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const policyFor = (clientId: number) =>
      (policies.data || []).find(
        policy => Number(policy.clientId) === Number(clientId)
      );
    const valueFor = (client: (typeof rows)[number]) => {
      const policy = policyFor(client.id);
      if (sortKey === "date") return String(policy?.issuedAt || "");
      if (sortKey === "type")
        return String(policy?.product || "").toLowerCase();
      if (sortKey === "coverage") return Number(policy?.coverageAmount || 0);
      if (sortKey === "premium") return Number(policy?.premiumAmount || 0);
      return String(client.name || "").toLowerCase();
    };
    return rows
      .filter(client => {
        const clientPolicies = (policies.data || []).filter(
          policy => Number(policy.clientId) === Number(client.id)
        );
        return `${client.name} ${client.email || ""} ${client.phone || ""} ${client.whatsapp || ""} ${clientPolicies.map(policy => `${policy.policyNumber} ${policy.product || ""} ${policy.issuedAt || ""} ${policy.coverageAmount || ""} ${policy.premiumAmount || ""}`).join(" ")}`
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        const first = valueFor(a),
          second = valueFor(b);
        const result =
          typeof first === "number" && typeof second === "number"
            ? first - second
            : String(first).localeCompare(String(second), "pt-BR", {
                numeric: true,
              });
        return sortDirection === "asc" ? result : -result;
      });
  }, [rows, policies.data, search, sortKey, sortDirection]);
  const changeSort = (key: SortKey) => {
    if (sortKey === key)
      setSortDirection(current => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };
  const edit = (client: any) => {
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
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" }));
  };
  useEffect(() => {
    const requested = Number(
      new URLSearchParams(window.location.search).get("cliente")
    );
    const requestedClient = rows.find(client => client.id === requested);
    if (requestedClient) {
      setSelectedId(requested);
      if (new URLSearchParams(window.location.search).get("completar") === "1")
        edit(requestedClient);
    }
  }, [rows]);
  useEffect(() => {
    if (!selectedId) return;
    markRead.mutate({ clientId: selectedId });
  }, [selectedId]);
  useEffect(() => {
    const container = conversationContainer.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
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
  const editPolicy = (policy: any) =>
    setPolicyForm({
      id: Number(policy.id),
      status: policy.status || "active",
      product: policy.product || "",
      issuedAt: isoDate(policy.issuedAt),
      premiumAmount: Number(policy.premiumAmount || 0),
      premiumFrequency: policy.premiumFrequency || "",
      targetPremium: Number(policy.targetPremium || 0),
      points: Math.round(Number(policy.points || 0)),
      coverageAmount: Number(policy.coverageAmount || 0),
      beneficiaries: policy.beneficiaries || "",
    });
  const savePolicyDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!policyForm) return;
    try {
      await updatePolicy.mutateAsync(policyForm);
      await policies.refetch();
      setPolicyForm(null);
      toast.success("Dados da apólice atualizados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a apólice");
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
                {form.id && missingFields.length ? "Completar cadastro do cliente" : form.id ? "Alterar cliente" : "Novo cliente"}
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
                className={missingFields.includes("e-mail") ? "border-amber-400 bg-amber-400/5" : ""}
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              <Input
                className={missingFields.includes("telefone") ? "border-amber-400 bg-amber-400/5" : ""}
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
                  className={`mt-2 ${missingFields.includes("data de nascimento") ? "border-amber-400 bg-amber-400/5" : ""}`}
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
                {form.id && missingFields.length ? "Salvar e concluir cadastro" : "Salvar cliente"}
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
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["name", "Nome"],
                    ["date", "Data"],
                    ["type", "Tipo de apólice"],
                    ["coverage", "Cobertura"],
                    ["premium", "Premium"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => changeSort(key)}
                    className={
                      sortKey === key ? "border-gold bg-gold/15 text-gold" : ""
                    }
                  >
                    {label}
                    {sortKey === key &&
                      (sortDirection === "asc" ? (
                        <ArrowUp className="ml-2 h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="ml-2 h-3.5 w-3.5" />
                      ))}
                  </Button>
                ))}
              </div>
            </Card>
            <Card className="overflow-hidden border-gold/20 bg-[#0b1524]">
              {filtered.map(client =>
                (() => {
                  const clientPolicies = (policies.data || []).filter(
                    policy => Number(policy.clientId) === Number(client.id)
                  );
                  const clientMissing = missingClientProfileFields(
                    client,
                    clientPolicies
                  );
                  return (
                    <div
                      key={client.id}
                      className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <button
                        onClick={() => setSelectedId(client.id)}
                        className="flex-1 text-left"
                      >
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {client.name}
                          {clientMissing.length > 0 && (
                            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                              {clientMissing.length} pendência
                              {clientMissing.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </p>
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
                  );
                })()
              )}
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
              <Button className={missingFields.length ? "bg-gold text-black" : ""} variant={missingFields.length ? "default" : "outline"} onClick={() => edit(selected)}>
                <Edit2 className="mr-2 h-4 w-4" />
                {missingFields.length ? "Completar cadastro" : "Alterar"}
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">
                    Ficha do cliente
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">{selected.name}</h2>
                </div>
                <span className="w-fit rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                  {statusLabels[selected.status as Status] || selected.status}
                </span>
              </div>
              {missingFields.length > 0 && (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-100 sm:flex-row sm:items-center">
                  <AlertTriangle
                    className="mt-0.5 shrink-0 text-amber-300"
                    size={20}
                  />
                  <div className="flex-1">
                    <p className="font-bold">Perfil incompleto</p>
                    <p className="mt-1 text-sm">
                      Faltando: {missingFields.join(", ")}.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="outline" className="border-amber-300/50 text-amber-100 hover:bg-amber-300/10" disabled={importSpreadsheet.isPending} onClick={() => spreadsheetInput.current?.click()}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Completar com Excel
                    </Button>
                    <input
                      ref={spreadsheetInput}
                      className="hidden"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={async event => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (!file) return;
                        try {
                          const parsed = await readClientSpreadsheet(file);
                          const selectedEmail = String(selected.email || primaryPolicy?.clientEmail || "").trim().toLowerCase();
                          const selectedName = String(selected.name || "").trim().toLowerCase();
                          const match = parsed.find(row => selectedEmail && row.clientEmail.trim().toLowerCase() === selectedEmail)
                            || parsed.find(row => row.clientName.trim().toLowerCase() === selectedName)
                            || (parsed.length === 1 ? parsed[0] : undefined);
                          if (!match) throw new Error("Não foi possível identificar este cliente na planilha");
                          const result = await importSpreadsheet.mutateAsync({ rows: [match] });
                          await Promise.all([clients.refetch(), policies.refetch()]);
                          toast.success(`Planilha conferida: ${result.updatedClients + result.updatedPolicies} cadastro(s) completado(s).`);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Não foi possível usar esta planilha");
                        }
                      }}
                    />
                    <Button className="bg-amber-400 text-black hover:bg-amber-300" onClick={() => edit(selected)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Completar manualmente
                    </Button>
                  </div>
                </div>
              )}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  [
                    "E-mail",
                    selected.email || primaryPolicy?.clientEmail,
                    "e-mail",
                  ],
                  [
                    "Telefone",
                    selected.phone || primaryPolicy?.clientPhone,
                    "telefone",
                  ],
                  ["WhatsApp", selected.whatsapp, ""],
                  [
                    "Data de nascimento",
                    displayDate(selected.birthDate || primaryPolicy?.birthDate),
                    "data de nascimento",
                  ],
                  ["Origem do cadastro", selected.source, ""],
                  [
                    "Total de apólices",
                    String(selectedPolicies.length),
                    "apólice",
                  ],
                ].map(([label, value, missingKey]) => (
                  <div
                    key={label}
                    className={`rounded-xl border p-4 ${missingKey && missingFields.includes(missingKey) ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-black/25"}`}
                  >
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {label}
                      {missingKey && missingFields.includes(missingKey) && (
                        <MissingBadge />
                      )}
                    </p>
                    <p className="mt-1 break-words font-semibold text-white">
                      {value || "Não informado"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Observações
                </p>
                <p className="mt-2 whitespace-pre-wrap text-gray-300">
                  {selected.notes || "Sem observações."}
                </p>
              </div>
            </Card>
            <div>
              <h2 className="text-xl font-bold text-gold">
                Apólices do cliente
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Dados extraídos dos PC Sheets vinculados a este cliente.
              </p>
            </div>
            {policyForm && (
              <Card className="border-2 border-gold/50 bg-[#0b1524] p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">Correção da pendência</p>
                    <h2 className="mt-1 text-xl font-bold">Completar dados da apólice</h2>
                  </div>
                  <Button variant="outline" onClick={() => setPolicyForm(null)}>Cancelar</Button>
                </div>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={savePolicyDetails}>
                  <label className="text-sm text-gray-300">Status da apólice
                    <select className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white" value={policyForm.status} onChange={e => setPolicyForm({ ...policyForm, status: e.target.value as PolicyEditForm["status"] })}>
                      <option value="active">Ativa</option>
                      <option value="lapse">Lapse</option>
                      <option value="declined">Recusada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </label>
                  <label className="text-sm text-gray-300">Tipo de apólice<Input className="mt-2" value={policyForm.product} onChange={e => setPolicyForm({ ...policyForm, product: e.target.value })} /></label>
                  <label className="text-sm text-gray-300">Data da aplicação<Input className="mt-2" type="date" value={policyForm.issuedAt} onChange={e => setPolicyForm({ ...policyForm, issuedAt: e.target.value })} /></label>
                  <label className="text-sm text-gray-300">Premium<Input className="mt-2" type="number" min="0" step="0.01" value={policyForm.premiumAmount} onChange={e => setPolicyForm({ ...policyForm, premiumAmount: Number(e.target.value) })} /></label>
                  <label className="text-sm text-gray-300">Frequência do premium<Input className="mt-2" placeholder="Mensal ou anual" value={policyForm.premiumFrequency} onChange={e => setPolicyForm({ ...policyForm, premiumFrequency: e.target.value })} /></label>
                  <label className="text-sm text-gray-300">Target premium anual<Input className="mt-2" type="number" min="0" step="0.01" value={policyForm.targetPremium} onChange={e => setPolicyForm({ ...policyForm, targetPremium: Number(e.target.value) })} /></label>
                  <label className="text-sm text-gray-300">Pontos<Input className="mt-2" type="number" min="0" step="1" value={policyForm.points} onChange={e => setPolicyForm({ ...policyForm, points: Math.round(Number(e.target.value)) })} /></label>
                  <label className="text-sm text-gray-300">Valor da cobertura<Input className="mt-2" type="number" min="0" step="0.01" value={policyForm.coverageAmount} onChange={e => setPolicyForm({ ...policyForm, coverageAmount: Number(e.target.value) })} /></label>
                  <label className="text-sm text-gray-300">Beneficiários<Input className="mt-2" value={policyForm.beneficiaries} onChange={e => setPolicyForm({ ...policyForm, beneficiaries: e.target.value })} /></label>
                  <Button className="bg-gold text-black md:col-span-2">Salvar e concluir dados da apólice</Button>
                </form>
              </Card>
            )}
            <div className="grid gap-4">
              {selectedPolicies.map(policy =>
                (() => {
                  const policyMissing = missingClientProfileFields(
                    { email: "ok", phone: "ok", birthDate: "ok" },
                    [policy]
                  );
                  return (
                    <Card
                      key={policy.id}
                      className="border-gold/20 bg-[#0b1524] p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-gold">
                            Número da apólice
                          </p>
                          <h3 className="mt-1 text-xl font-bold">
                            {policy.policyNumber || "Não informado"}
                          </h3>
                          <p className="mt-1 text-sm text-gray-400">
                            {policy.product || "Produto não informado"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <ShieldCheck className="text-gold" />
                          <Button
                            size="sm"
                            className={policyMissing.length ? "bg-amber-400 text-black hover:bg-amber-300" : ""}
                            variant={policyMissing.length ? "default" : "outline"}
                            onClick={() => editPolicy(policy)}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            {policyMissing.length ? "Completar apólice" : "Alterar apólice"}
                          </Button>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          [
                            "Status",
                            ({ active: "Ativa", lapse: "Lapse", declined: "Recusada", cancelled: "Cancelada" } as const)[String(policy.status || "active") as "active" | "lapse" | "declined" | "cancelled"],
                            "",
                          ],
                          [
                            "Data da aplicação",
                            displayDate(policy.issuedAt),
                            "data da aplicação",
                          ],
                          [
                            "Premium",
                            `${currency(policy.premiumAmount)}${policy.premiumFrequency ? ` · ${policy.premiumFrequency}` : ""}`,
                            "premium",
                          ],
                          [
                            "Target premium anual",
                            currency(policy.targetPremium),
                            "target premium",
                          ],
                          [
                            "Pontos",
                            String(Math.round(Number(policy.points || 0))),
                            "",
                          ],
                          [
                            "Valor da cobertura",
                            currency(policy.coverageAmount),
                            "cobertura",
                          ],
                          [
                            "Beneficiários",
                            policy.beneficiaries,
                            "beneficiários",
                          ],
                          ["E-mail extraído", policy.clientEmail, ""],
                          ["Telefone extraído", policy.clientPhone, ""],
                        ].map(([label, value, missingKey]) => (
                          <div
                            key={label}
                            className={`rounded-xl border p-3 ${missingKey && policyMissing.includes(missingKey) ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-black/25"}`}
                          >
                            <p className="text-xs text-gray-500">
                              {label}
                              {missingKey &&
                                policyMissing.includes(missingKey) && (
                                  <MissingBadge />
                                )}
                            </p>
                            <p className="mt-1 break-words text-sm font-semibold text-white">
                              {value || "Não informado"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })()
              )}
              {!selectedPolicies.length && (
                <Card className="border-white/10 bg-[#0b1524] p-6 text-center text-gray-400">
                  Nenhuma apólice vinculada a este cliente.
                </Card>
              )}
            </div>
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
              <div ref={conversationContainer} className="mt-5 flex max-h-[34rem] min-h-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#050b13] p-4 sm:p-5">
                {(emails.data || []).map(message => (
                  <div
                    key={message.id}
                    className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${message.direction === "sent" ? "ml-auto rounded-br-sm bg-gold text-black" : "mr-auto rounded-bl-sm bg-[#17395c] text-white"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-xs font-bold ${message.direction === "sent" ? "text-black/65" : "text-sky-200"}`}
                      >
                        {message.direction === "sent" ? "Você" : selected.name}
                      </p>
                      <p
                        className={`text-xs ${message.direction === "sent" ? "text-black/55" : "text-white/55"}`}
                      >
                        {new Date(String(message.sentAt)).toLocaleString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                    <p
                      className={`mt-2 text-xs font-semibold ${message.direction === "sent" ? "text-black/60" : "text-white/60"}`}
                    >
                      {message.subject}
                    </p>
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
                  {!emails.data?.length && (
                    <Input
                      className="h-9 max-w-sm border-white/10 bg-black/20 text-sm"
                      placeholder="Assunto da nova conversa (opcional)"
                      value={emailSubject}
                      onChange={event => setEmailSubject(event.target.value)}
                    />
                  )}
                  <Button
                    className="bg-gold px-7 text-black"
                    disabled={
                      !selected.email ||
                      !emailBody.trim() ||
                      sendEmail.isPending
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
          </>
        )}
      </main>
    </div>
  );
}
