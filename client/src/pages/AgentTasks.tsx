import AgentSidebar from "@/components/AgentSidebar";
import { PcSheetUpload } from "./AgentPolicies";

export default function AgentTasks() {
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
            Importe PC Sheets e transforme os dados das apólices em cadastros organizados.
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
      </main>
    </div>
  );
}
