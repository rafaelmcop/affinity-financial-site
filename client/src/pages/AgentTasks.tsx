import AgentSidebar from "@/components/AgentSidebar";
import { PcSheetUpload, SpreadsheetUpload } from "./AgentPolicies";

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
            Importe PC Sheets ou planilhas e transforme os dados em cadastros organizados.
          </p>
        </div>
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gold">Enviar PC Sheet ou ficha Excel</h2>
            <p className="mt-1 text-sm text-gray-400">
              Envie PDF, Excel ou CSV. O sistema escolhe o leitor correto e cria o cadastro automaticamente.
            </p>
          </div>
          <PcSheetUpload />
        </section>
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gold">Importar planilha Excel</h2>
            <p className="mt-1 text-sm text-gray-400">
              Cadastre clientes sem PC Sheet ou complete informações que estejam faltando.
            </p>
          </div>
          <SpreadsheetUpload />
        </section>
      </main>
    </div>
  );
}
