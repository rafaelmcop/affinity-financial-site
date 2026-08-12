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
  const pageLines: string[][] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 12); i++) {
    const page = await pdf.getPage(i),
      content = await page.getTextContent();
    const rows = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim() || !("transform" in item))
        continue;
      const y = Math.round(item.transform[5]);
      const row = rows.get(y) || [];
      row.push({ x: item.transform[4], text: item.str.trim() });
      rows.set(y, row);
    }
    pageLines.push(
      Array.from(rows.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, row]) =>
          row
            .sort((a, b) => a.x - b.x)
            .map(item => item.text)
            .join(" | ")
        )
    );
  }
  const pages = pageLines.map(lines => lines.join("\n")),
    all = pages.join("\n").replace(/[ \t]+/g, " "),
    cover = pageLines[0] || [];
  const find = (text: string, re: RegExp) => text.match(re)?.[1]?.trim() || "";
  const afterLine = (lines: string[], label: RegExp) => {
    const index = lines.findIndex(line => label.test(line));
    return index >= 0 ? (lines[index + 1] || "").split("|")[0].trim() : "";
  };
  let email = find(all, /([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/);
  let dob =
    cover.find(line => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(line.trim()))?.trim() ||
    find(
      all,
      /Date of Birth[^\n]*\n([^\n]*?\b\d{1,2}\/\d{1,2}\/\d{4}\b)/
    ).match(/\d{1,2}\/\d{1,2}\/\d{4}/)?.[0] ||
    "";
  let policy =
    afterLine(cover, /Transaction ID/i) || find(all, /\b(LS\d{6,})\b/i);
  let product =
    afterLine(cover, /^Product:/i) ||
    find(all, /Product Name:[^\n]*\n([^|\n]+)/i);
  let coverage =
    afterLine(cover, /Face Amount/i) ||
    find(all, /Face Amount:[^\n]*\n([^|\n]*\$[\d,]+)/i);
  let name =
    afterLine(cover, /Proposed Insured:.*Agent:/i) ||
    find(all, /Name \(print first, middle, last\)[^\n]*\n([^|\n]+)/i);
  const contactLine =
    pageLines.flat().find(line => line.includes(email) && /\d/.test(line)) ||
    "";
  const phoneDigits = contactLine
    .replace(email, "")
    .replace(/\D/g, "")
    .slice(0, 10);
  let phone =
    phoneDigits.length === 10
      ? `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`
      : "";
  const premiumLine =
    pageLines
      .flat()
      .find(line => /Planned Periodic\/Modal Premium/i.test(line)) || "";
  let premium = (premiumLine.match(/\$[\d,]+\.\d{2}/g) || []).at(-1) || "";
  const flatLines = pageLines.flat();
  const primaryIndex = flatLines.findIndex(line => /^Primary:/i.test(line));
  const primaryLine =
    primaryIndex >= 0 ? flatLines[primaryIndex + 1] || "" : "";
  const beneficiaryLines = [
    ...flatLines.filter(line => /Relationship to Insured:/i.test(line)),
    primaryLine,
  ];
  const beneficiaries = beneficiaryLines
    .map(line =>
      line
        .split("Relationship to Insured:")[0]
        .replace(/^.*Primary:\s*/i, "")
        .replace(/\s*\|\s*/g, " ")
        .trim()
    )
    .filter(value => /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{3,}$/.test(value));
  const corebridge = /American General Life Insurance Company|Corebridge/i.test(
    all
  );
  if (corebridge) {
    const clean = all
      .replace(/\(cid:\d+\)/g, " ")
      .replace(/_/g, "")
      .replace(/\s+/g, " ");
    const compact = clean
      .replace(/(\d)\s+(?=[\d/.-])/g, "$1")
      .replace(/([/.-])\s+(?=\d)/g, "$1");
    const cleanLines = flatLines
      .map(line =>
        line
          .replace(/_/g, "")
          .replace(/\s*\|\s*/g, " ")
          .trim()
      )
      .filter(line => line && !/\(cid:/i.test(line));
    const applicationIndex = cleanLines.findIndex(line =>
      /^\d{10}$/.test(line)
    );
    policy =
      applicationIndex >= 0
        ? cleanLines[applicationIndex]
        : find(clean, /\b(\d{10})\b/);
    name =
      applicationIndex >= 0 ? cleanLines[applicationIndex + 1] || "" : name;
    dob = find(compact, /\bDOB\s*(\d{1,2}\/\d{1,2}\/\d{4})/i) || dob;
    email = find(clean, /([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/) || email;
    const corePhone = find(
      clean,
      /Primary Phone\s*(\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{4})/i
    ).replace(/\D/g, "");
    if (corePhone.length === 10)
      phone = `(${corePhone.slice(0, 3)}) ${corePhone.slice(3, 6)}-${corePhone.slice(6)}`;
    product =
      find(
        clean,
        /Plan Name.*?\b([A-Za-z][A-Za-z0-9 ()-]{4,}?)\s+Term Duration/i
      ).trim() || product;
    coverage =
      find(
        clean,
        /Amount Applied For:\s*Base Coverage\s*\$?\s*(\$?[\d,]+\.\d{2})/i
      ) || coverage;
    premium =
      find(clean, /Premium Payment\s+X?\s*Modal\s*\$?\s*(\$?[\d,]+\.\d{2})/i) ||
      premium;
    const coreBeneficiary = find(
      clean,
      /\b([A-Z][A-Za-z' -]{4,})\s+\d{1,2}\/\d{1,2}\/\d{4}.*?\b(?:Mother|Father|Sister|Brother|Son|Daughter|Spouse|Wife|Husband)\b/i
    );
    if (coreBeneficiary) beneficiaries.unshift(coreBeneficiary.trim());
  }
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
    beneficiaries: Array.from(new Set(beneficiaries)).join(", "),
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
              const extracted = await readPcSheet(file);
              setForm(extracted);
              const filled = Object.values(extracted).filter(
                value => value !== "" && value !== 0
              ).length;
              if (!extracted.clientName && !extracted.policyNumber)
                toast.error(
                  "O PDF não possui texto legível. Tente baixar o PC Sheet original novamente."
                );
              else
                toast.success(
                  `${filled} campos extraídos. Confira antes de salvar.`
                );
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
        <label className="text-sm text-gray-300">
          Nome completo
          <Input
            className="mt-2"
            placeholder="Nome do cliente"
            value={form.clientName}
            onChange={e => setForm({ ...form, clientName: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-300">
          E-mail
          <Input
            className="mt-2"
            type="email"
            placeholder="E-mail do cliente"
            value={form.clientEmail}
            onChange={e => setForm({ ...form, clientEmail: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-300">
          Telefone
          <Input
            className="mt-2"
            placeholder="Telefone do cliente"
            value={form.clientPhone}
            onChange={e => setForm({ ...form, clientPhone: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-300">
          Data de nascimento
          <Input
            className="mt-2"
            inputMode="numeric"
            placeholder="MM/DD/AAAA"
            value={form.birthDate}
            onChange={e => setForm({ ...form, birthDate: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Aniversário · mensagem programada para 08:30 AM
          </p>
        </label>
        <label className="text-sm text-gray-300">
          Número da apólice / transação
          <Input
            className="mt-2"
            placeholder="Ex.: LS810380300"
            value={form.policyNumber}
            onChange={e => setForm({ ...form, policyNumber: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-300">
          Produto
          <Input
            className="mt-2"
            placeholder="Nome do produto"
            value={form.product}
            onChange={e => setForm({ ...form, product: e.target.value })}
          />
        </label>
        <label className="text-sm text-gray-300">
          Valor do premium
          <Input
            className="mt-2"
            type="number"
            step=".01"
            placeholder="Premium"
            value={form.premiumAmount || ""}
            onChange={e =>
              setForm({ ...form, premiumAmount: Number(e.target.value) })
            }
          />
        </label>
        <label className="text-sm text-gray-300">
          Frequência do premium
          <Input
            className="mt-2"
            placeholder="Ex.: Mensal"
            value={form.premiumFrequency}
            onChange={e =>
              setForm({ ...form, premiumFrequency: e.target.value })
            }
          />
        </label>
        <label className="text-sm text-gray-300">
          Valor da cobertura
          <Input
            className="mt-2"
            type="number"
            step=".01"
            placeholder="Valor da cobertura"
            value={form.coverageAmount || ""}
            onChange={e =>
              setForm({ ...form, coverageAmount: Number(e.target.value) })
            }
          />
        </label>
        <label className="text-sm text-gray-300">
          Beneficiários
          <Input
            className="mt-2"
            placeholder="Nomes dos beneficiários"
            value={form.beneficiaries}
            onChange={e => setForm({ ...form, beneficiaries: e.target.value })}
          />
        </label>
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
