import { useState } from "react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PcSheetUpload } from "./AgentPolicies";

export default function AgentTasks() {
  const tasks = trpc.agent.listTasks.useQuery();
  const create = trpc.agent.createTask.useMutation();
  const toggle = trpc.agent.toggleTask.useMutation();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AgentSidebar />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
            Organização
          </p>
          <h1 className="mt-2 text-3xl font-bold">Tarefas</h1>
          <p className="mt-2 text-gray-400">
            Organize seus acompanhamentos e veja os avisos de aniversário das
            apólices.
          </p>
        </div>
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gold">Enviar PC Sheet</h2>
            <p className="mt-1 text-sm text-gray-400">
              Importe a apólice e crie o cadastro do cliente automaticamente.
            </p>
          </div>
          <PcSheetUpload />
        </section>
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gold">Suas tarefas</h2>
          <Card className="grid gap-3 border-gold/20 bg-[#0b1524] p-5 md:grid-cols-[1fr_240px_auto]">
            <Input
              placeholder="Nova tarefa"
              value={title}
              onChange={event => setTitle(event.target.value)}
            />
            <Input
              type="datetime-local"
              value={dueAt}
              onChange={event => setDueAt(event.target.value)}
            />
            <Button
              className="bg-gold text-black"
              onClick={async () => {
                if (!title.trim()) return;
                await create.mutateAsync({
                  title,
                  dueAt: dueAt ? new Date(dueAt).toISOString() : "",
                });
                setTitle("");
                setDueAt("");
                await tasks.refetch();
                toast.success("Tarefa criada");
              }}
            >
              Adicionar
            </Button>
          </Card>
          <div className="space-y-3">
            {(tasks.data || []).map(task => (
              <Card
                key={task.id}
                className="flex items-center gap-3 border-white/10 bg-[#0b1524] p-4"
              >
                <input
                  type="checkbox"
                  checked={task.status === "completed"}
                  onChange={async event => {
                    await toggle.mutateAsync({
                      id: task.id,
                      completed: event.target.checked,
                    });
                    await tasks.refetch();
                  }}
                />
                <div>
                  <p
                    className={
                      task.status === "completed"
                        ? "text-gray-500 line-through"
                        : ""
                    }
                  >
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {task.dueAt
                      ? new Date(String(task.dueAt)).toLocaleString("pt-BR")
                      : "Sem data"}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
