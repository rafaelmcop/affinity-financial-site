import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Edit2,
  Plus,
  Search,
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
  "new" | "contacted" | "meeting" | "proposal" | "client" | "closed";
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

export default function AgentClients() {
  const clients = trpc.agent.listClients.useQuery(),
    policies = trpc.agent.listPolicies.useQuery();
  const saveClient = trpc.agent.saveClient.useMutation(),
    remove = trpc.agent.deleteClient.useMutation();
  const [search, setSearch] = useState(""),
    [selectedId, setSelectedId] = useState<number | null>(null),
    [form, setForm] = useState<Form | null>(null);
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
