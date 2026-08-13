import { useState } from "react";
import { Edit2, FileText, Trash2, Users } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminAgentPortfolio() {
  const [agentEmail, setAgentEmail] = useState("");
  const [view, setView] = useState<"clients" | "policies">("clients");
  const [editing, setEditing] = useState<any>(null);
  const agents = trpc.crm.assignees.useQuery();
  const portfolio = trpc.crm.agentPortfolio.useQuery(
    { agentEmail },
    { enabled: Boolean(agentEmail) }
  );
  const updateClient = trpc.crm.updatePortfolioClient.useMutation();
  const deleteClient = trpc.crm.deletePortfolioClient.useMutation();
  const updatePolicy = trpc.crm.updatePortfolioPolicy.useMutation();
  const deletePolicy = trpc.crm.deletePortfolioPolicy.useMutation();
  const refresh = () => portfolio.refetch();
  const agentOptions = (agents.data || []).filter(item =>
    ["agent", "both"].includes(String(item.accountType || ""))
  );

  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AdminSidebar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
            Carteiras da equipe
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Clientes e apólices por agente
          </h1>
          <p className="mt-2 text-gray-400">
            Selecione um agente para administrar individualmente sua carteira.
          </p>
        </div>
        <Card className="border-gold/20 bg-[#0b1524] p-4">
          <select
            className="h-11 w-full rounded-md border border-white/20 bg-black px-3"
            value={agentEmail}
            onChange={event => {
              setAgentEmail(event.target.value);
              setEditing(null);
            }}
          >
            <option value="">Selecione um agente</option>
            {agentOptions.map(agent => (
              <option key={agent.id} value={agent.email.toLowerCase()}>
                {agent.name} · {agent.email}
              </option>
            ))}
          </select>
          {agentEmail && (
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => setView("clients")}
                className={view === "clients" ? "bg-gold text-black" : ""}
                variant={view === "clients" ? "default" : "outline"}
              >
                <Users className="mr-2 h-4 w-4" />
                Clientes ({portfolio.data?.clients.length || 0})
              </Button>
              <Button
                onClick={() => setView("policies")}
                className={view === "policies" ? "bg-gold text-black" : ""}
                variant={view === "policies" ? "default" : "outline"}
              >
                <FileText className="mr-2 h-4 w-4" />
                Apólices ({portfolio.data?.policies.length || 0})
              </Button>
            </div>
          )}
        </Card>
        {editing && (
          <Card className="border-gold/30 bg-[#0b1524] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gold">
                Alterar {editing.kind === "client" ? "cliente" : "apólice"}
              </h2>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {editing.kind === "client" ? (
                <>
                  <Input
                    placeholder="Nome"
                    value={editing.name}
                    onChange={e =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                  <Input
                    placeholder="E-mail"
                    value={editing.email || ""}
                    onChange={e =>
                      setEditing({ ...editing, email: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Telefone"
                    value={editing.phone || ""}
                    onChange={e =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                  />
                  <Input
                    type="date"
                    value={String(editing.birthDate || "").slice(0, 10)}
                    onChange={e =>
                      setEditing({ ...editing, birthDate: e.target.value })
                    }
                  />
                  <Input
                    className="md:col-span-2"
                    placeholder="Observações"
                    value={editing.notes || ""}
                    onChange={e =>
                      setEditing({ ...editing, notes: e.target.value })
                    }
                  />
                </>
              ) : (
                <>
                  <Input
                    placeholder="Número"
                    value={editing.policyNumber}
                    onChange={e =>
                      setEditing({ ...editing, policyNumber: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Produto"
                    value={editing.product || ""}
                    onChange={e =>
                      setEditing({ ...editing, product: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Premium"
                    value={editing.premiumAmount || ""}
                    onChange={e =>
                      setEditing({
                        ...editing,
                        premiumAmount: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Cobertura"
                    value={editing.coverageAmount || ""}
                    onChange={e =>
                      setEditing({
                        ...editing,
                        coverageAmount: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    type="date"
                    value={String(editing.issuedAt || "").slice(0, 10)}
                    onChange={e =>
                      setEditing({ ...editing, issuedAt: e.target.value })
                    }
                  />
                </>
              )}
              <Button
                className="bg-gold text-black md:col-span-2"
                onClick={async () => {
                  try {
                    if (editing.kind === "client")
                      await updateClient.mutateAsync({
                        id: editing.id,
                        agentEmail,
                        name: editing.name,
                        email: editing.email || "",
                        phone: editing.phone || "",
                        birthDate: String(editing.birthDate || "").slice(0, 10),
                        notes: editing.notes || "",
                      });
                    else
                      await updatePolicy.mutateAsync({
                        id: editing.id,
                        agentEmail,
                        policyNumber: editing.policyNumber,
                        product: editing.product || "",
                        premiumAmount: Number(editing.premiumAmount || 0),
                        coverageAmount: Number(editing.coverageAmount || 0),
                        issuedAt: String(editing.issuedAt || "").slice(0, 10),
                      });
                    setEditing(null);
                    await refresh();
                    toast.success("Informações atualizadas");
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Não foi possível atualizar"
                    );
                  }
                }}
              >
                Salvar alterações
              </Button>
            </div>
          </Card>
        )}
        {!agentEmail ? (
          <Card className="border-white/10 bg-[#0b1524] p-12 text-center text-gray-500">
            Selecione um agente para abrir sua carteira.
          </Card>
        ) : view === "clients" ? (
          <div className="space-y-3">
            {(portfolio.data?.clients || []).map(client => (
              <Card
                key={client.id}
                className="flex flex-col gap-3 border-white/10 bg-[#0b1524] p-5 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="font-bold">{client.name}</p>
                  <p className="text-sm text-gray-400">
                    {client.email || "Sem e-mail"} ·{" "}
                    {client.phone || "Sem telefone"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setEditing({ ...client, kind: "client" })}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Alterar
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!confirm("Excluir este cliente?")) return;
                    try {
                      await deleteClient.mutateAsync({
                        id: client.id,
                        agentEmail,
                      });
                      await refresh();
                      toast.success("Cliente excluído");
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Não foi possível excluir"
                      );
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(portfolio.data?.policies || []).map(policy => (
              <Card
                key={policy.id}
                className="flex flex-col gap-3 border-white/10 bg-[#0b1524] p-5 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="font-bold">
                    {policy.clientName} · {policy.policyNumber}
                  </p>
                  <p className="text-sm text-gray-400">
                    {policy.product || "Sem produto"} · Premium $
                    {Number(policy.premiumAmount || 0).toFixed(2)} · Cobertura $
                    {Number(policy.coverageAmount || 0).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setEditing({ ...policy, kind: "policy" })}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Alterar
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!confirm("Excluir esta apólice?")) return;
                    await deletePolicy.mutateAsync({
                      id: policy.id,
                      agentEmail,
                    });
                    await refresh();
                    toast.success("Apólice excluída");
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
