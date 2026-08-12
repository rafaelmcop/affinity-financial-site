import { useState } from "react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, ShieldCheck } from "lucide-react";
type PolicyForm = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  birthDate: string;
  policyNumber: string;
  product: string;
  premiumAmount: number;
  premiumFrequency: string;
  coverageAmount: number;
  beneficiaries: string;
};
const empty: PolicyForm = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  birthDate: "",
  policyNumber: "",
  product: "",
  premiumAmount: 0,
  premiumFrequency: "",
  coverageAmount: 0,
  beneficiaries: "",
};
const money = (v: string) => Number(v.replace(/[$,]/g, "")) || 0;
async function readPcSheet(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() })
    .promise;
  const pageItems: string[][] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 12); i++) {
    const page = await pdf.getPage(i),
      content = await page.getTextContent();
    pageItems.push(
      content.items
        .map(item => ("str" in item ? item.str.trim() : ""))
        .filter(Boolean)
    );
  }
  const pages = pageItems.map(items => items.join(" ")),
    all = pages.join(" ").replace(/\s+/g, " "),
    cover = pageItems[0] || [];
  const find = (text: string, re: RegExp) => text.match(re)?.[1]?.trim() || "";
  const coverValues = cover.slice(
    Math.max(0, cover.indexOf("INSTRUCTIONS:") + 1)
  );
  const email = find(all, /([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/);
  const dob =
    coverValues.find(value => /^\d{2}\/\d{2}\/\d{4}$/.test(value)) ||
    find(all, /Date of Birth\D{0,80}(\d{2}\/\d{2}\/\d{4})/);
  const policy =
    coverValues.find(value => /^LS\d{6,}$/i.test(value)) ||
    find(all, /\b(LS\d{6,})\b/);
  const product =
    coverValues.find(value => /^(?:LSW|NLIC)\s*[A-Z0-9-]+$/i.test(value)) || "";
  const coverage =
    coverValues.find(value => /^\$[\d,]+$/.test(value)) ||
    find(all, /Face Amount\D{0,80}(\$[\d,]+)/);
  const name =
    coverValues.find(
      value =>
        /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{5,}$/.test(value) &&
        !/(National|Rafael|reviewed|application)/i.test(value)
    ) || "";
  const phone = (all.match(/\(\d{3}\)\s*\d{3}-\d{4}/g) || [])[0] || "";
  const premium = (pages[4]?.match(/\$\d[\d,]*\.\d{2}/g) || []).at(-1) || "";
  const beneficiary = find(
    all,
    /Primary:\s*(?:The beneficiary.*?\))?\s*([A-Z][A-Za-zÀ-ÿ' -]{4,}?)\s+Relationship to Insured:/
  );
  const dobParts = dob.split("/");
  return {
    clientName: name,
    clientEmail: email,
    clientPhone: phone,
    birthDate:
      dobParts.length === 3
        ? `${dobParts[0].padStart(2, "0")}/${dobParts[1].padStart(2, "0")}/${dobParts[2]}`
        : "",
    policyNumber: policy,
    product,
    premiumAmount: money(premium),
    premiumFrequency: /\bMonthly\b/.test(all)
      ? "Mensal"
      : /\bAnnual\b/.test(all)
        ? "Anual"
        : "",
    coverageAmount: money(coverage),
    beneficiaries: beneficiary,
  };
}
export function PcSheetUpload() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const save = trpc.agent.savePcSheet.useMutation();
  const utils = trpc.useUtils();
  return (
    <Card className="border-gold/20 bg-[#0b1524] p-6">
      <div className="rounded-xl border border-dashed border-gold/40 bg-black/30 p-6 text-center">
        <Upload className="mx-auto text-gold" />
        <p className="mt-3 font-bold">Selecione um PC Sheet em PDF</p>
        <p className="mt-1 text-xs text-gray-400">
          A leitura acontece neste navegador. Dados bancários, SSN e informações
          médicas são ignorados.
        </p>
        <Input
          className="mx-auto mt-4 max-w-md"
          type="file"
          accept="application/pdf"
          onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            setLoading(true);
            try {
              setForm(await readPcSheet(file));
              toast.success("Campos extraídos. Confira antes de salvar.");
            } catch {
              toast.error("Não foi possível ler este PDF");
            } finally {
              setLoading(false);
            }
          }}
        />
        {loading && (
          <p className="mt-3 text-sm text-gold">Lendo documento...</p>
        )}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Input
          placeholder="Nome"
          value={form.clientName}
          onChange={e => setForm({ ...form, clientName: e.target.value })}
        />
        <Input
          type="email"
          placeholder="E-mail"
          value={form.clientEmail}
          onChange={e => setForm({ ...form, clientEmail: e.target.value })}
        />
        <Input
          placeholder="Telefone"
          value={form.clientPhone}
          onChange={e => setForm({ ...form, clientPhone: e.target.value })}
        />
        <div>
          <Input
            inputMode="numeric"
            placeholder="MM/DD/AAAA"
            value={form.birthDate}
            onChange={e => setForm({ ...form, birthDate: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Aniversário · mensagem programada para 08:30 AM
          </p>
        </div>
        <Input
          placeholder="Número da apólice / transação"
          value={form.policyNumber}
          onChange={e => setForm({ ...form, policyNumber: e.target.value })}
        />
        <Input
          placeholder="Produto"
          value={form.product}
          onChange={e => setForm({ ...form, product: e.target.value })}
        />
        <Input
          type="number"
          step=".01"
          placeholder="Premium"
          value={form.premiumAmount || ""}
          onChange={e =>
            setForm({ ...form, premiumAmount: Number(e.target.value) })
          }
        />
        <Input
          placeholder="Frequência"
          value={form.premiumFrequency}
          onChange={e => setForm({ ...form, premiumFrequency: e.target.value })}
        />
        <Input
          type="number"
          step=".01"
          placeholder="Valor da cobertura"
          value={form.coverageAmount || ""}
          onChange={e =>
            setForm({ ...form, coverageAmount: Number(e.target.value) })
          }
        />
        <Input
          placeholder="Beneficiários"
          value={form.beneficiaries}
          onChange={e => setForm({ ...form, beneficiaries: e.target.value })}
        />
        <Button
          className="bg-gold text-black md:col-span-2"
          disabled={!form.clientName || !form.policyNumber || save.isPending}
          onClick={async () => {
            try {
              const result = await save.mutateAsync(form);
              setForm(empty);
              await Promise.all([
                utils.agent.listPolicies.invalidate(),
                utils.agent.listMessages.invalidate(),
                utils.agent.listTasks.invalidate(),
                utils.crm.list.invalidate(),
              ]);
              toast.success(
                `Cliente pronto: ${result.automationCount ?? 0} mensagens e acompanhamentos programados`
              );
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Erro ao salvar"
              );
            }
          }}
        >
          {save.isPending
            ? "Criando cliente e automações..."
            : "Confirmar e automatizar"}
        </Button>
      </div>
    </Card>
  );
}
export default function AgentPolicies({
  uploadOnly = false,
}: {
  uploadOnly?: boolean;
}) {
  const q = trpc.agent.listPolicies.useQuery();
  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AgentSidebar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
            {uploadOnly ? "Importação segura" : "Carteira"}
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            {uploadOnly ? "Enviar PC Sheet" : "Minhas apólices"}
          </h1>
        </div>
        {uploadOnly ? (
          <PcSheetUpload />
        ) : (
          <div className="grid gap-4">
            {(q.data || []).map(p => (
              <Card key={p.id} className="border-gold/20 bg-[#0b1524] p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{p.clientName}</h2>
                    <p className="text-sm text-gray-400">
                      {p.policyNumber} · {p.product || "Produto não informado"}
                    </p>
                  </div>
                  <ShieldCheck className="text-gold" />
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <span>
                    Premium:{" "}
                    <b>
                      ${Number(p.premiumAmount || 0).toFixed(2)}{" "}
                      {p.premiumFrequency}
                    </b>
                  </span>
                  <span>
                    Cobertura:{" "}
                    <b>${Number(p.coverageAmount || 0).toLocaleString()}</b>
                  </span>
                  <span>
                    Beneficiário: <b>{p.beneficiaries || "Não informado"}</b>
                  </span>
                </div>
              </Card>
            ))}
            {q.data?.length === 0 && (
              <Card className="border-white/10 bg-[#0b1524] p-8 text-center text-gray-400">
                Nenhuma apólice cadastrada.
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
