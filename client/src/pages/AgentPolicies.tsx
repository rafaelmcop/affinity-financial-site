import { useMemo, useState } from "react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FileSpreadsheet, Search, Upload, ShieldCheck, X } from "lucide-react";
import { extractApplicationDate } from "../../../shared/pcSheet";
type PolicyForm = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  birthDate: string;
  policyNumber: string;
  product: string;
  premiumAmount: number;
  premiumFrequency: string;
  targetPremium: number;
  points: number;
  coverageAmount: number;
  beneficiaries: string;
  issuedAt: string;
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
  targetPremium: 0,
  points: 0,
  coverageAmount: 0,
  beneficiaries: "",
  issuedAt: "",
};
const money = (v: string) => {
  const cleaned = v.replace(/[$,\s]/g, "").toLowerCase();
  const value = Number(cleaned.replace(/[km]$/, ""));
  if (!Number.isFinite(value)) return 0;
  if (cleaned.endsWith("m")) return value * 1_000_000;
  if (cleaned.endsWith("k")) return value * 1_000;
  return value;
};
type SpreadsheetRow = PolicyForm & {
  policyStatus: "active" | "lapse" | "declined" | "cancelled";
};
const cleanHeader = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const spreadsheetValue = (row: Record<string, unknown>, aliases: string[]) => {
  const entries = Object.entries(row).map(([key, value]) => [cleanHeader(key), String(value ?? "").trim()] as const);
  for (const alias of aliases) {
    const found = entries.find(([key]) => key === alias || key.includes(alias));
    if (found?.[1]) return found[1];
  }
  return "";
};
const spreadsheetDate = (value: string) => {
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  return us ? `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}` : "";
};
export const spreadsheetBirthDate = (value: string) => {
  const text = String(value || "").trim();
  if (!text) return "";
  // Excel may expose a date-formatted cell as its internal day serial when the
  // author saved the cell with a General/custom format (34618 = 10/11/1994).
  if (/^\d{4,5}(?:\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial >= 1 && serial <= 100000) {
      const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
      return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}/${date.getUTCFullYear()}`;
    }
  }
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[2].padStart(2, "0")}/${iso[3].padStart(2, "0")}/${iso[1]}`;
  const us = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})/);
  if (us) {
    const year = us[3].length === 2 ? Number(us[3]) + (Number(us[3]) > 30 ? 1900 : 2000) : Number(us[3]);
    return `${us[1].padStart(2, "0")}/${us[2].padStart(2, "0")}/${year}`;
  }
  const named = new Date(text);
  if (!Number.isNaN(named.getTime()))
    return `${String(named.getUTCMonth() + 1).padStart(2, "0")}/${String(named.getUTCDate()).padStart(2, "0")}/${named.getUTCFullYear()}`;
  return text;
};
const spreadsheetStatus = (value: string): SpreadsheetRow["policyStatus"] => {
  const normalized = cleanHeader(value);
  if (normalized.includes("lapse")) return "lapse";
  if (normalized.includes("recus") || normalized.includes("declin")) return "declined";
  if (normalized.includes("cancel")) return "cancelled";
  return "active";
};
export async function readClientSpreadsheet(file: File): Promise<SpreadsheetRow[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const createdAt = workbook.Props?.CreatedDate ? new Date(workbook.Props.CreatedDate) : null;
  const fileCreationDate = createdAt && !Number.isNaN(createdAt.getTime())
    ? createdAt.toISOString().slice(0, 10)
    : "";
  const tableRows = workbook.SheetNames.flatMap(sheetName =>
    XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "", raw: false })
  );
  const fromTable = tableRows.map(row => {
    const premiumAmount = money(spreadsheetValue(row, ["premium", "premio", "valor premium"]));
    const frequency = spreadsheetValue(row, ["frequencia", "frequency", "modal"]);
    const suppliedTarget = money(spreadsheetValue(row, ["target premium", "premium anual"]));
    const targetPremium = suppliedTarget || premiumAmount * 12;
    const suppliedPoints = money(spreadsheetValue(row, ["pontos", "points"]));
    return {
      clientName: spreadsheetValue(row, ["nome completo", "nome cliente", "client name", "cliente", "nome"]),
      clientEmail: spreadsheetValue(row, ["e mail", "email"]),
      clientPhone: spreadsheetValue(row, ["telefone", "celular", "phone", "whatsapp"]),
      birthDate: spreadsheetBirthDate(spreadsheetValue(row, ["data nascimento", "nascimento", "date of birth", "dob"])),
      policyNumber: spreadsheetValue(row, ["numero apolice", "apolice numero", "policy number", "apolice"]),
      product: spreadsheetValue(row, ["tipo apolice", "produto", "product"]),
      policyStatus: spreadsheetStatus(spreadsheetValue(row, ["status apolice", "policy status", "status"])),
      premiumAmount, premiumFrequency: frequency, targetPremium,
      points: Math.round(suppliedPoints || targetPremium),
      coverageAmount: money(spreadsheetValue(row, ["valor cobertura", "cobertura", "coverage", "face amount"])),
      beneficiaries: spreadsheetValue(row, ["beneficiarios", "beneficiario", "beneficiaries"]),
      issuedAt: spreadsheetDate(spreadsheetValue(row, ["data aplicacao", "application date", "date esigned", "data emissao"])) || fileCreationDate,
    } satisfies SpreadsheetRow;
  }).filter(row => row.clientName);

  // Algumas fichas cadastrais são formulários visuais: os rótulos e valores
  // ficam espalhados pela planilha, em vez de formarem uma tabela com cabeçalho.
  const fromForms = workbook.SheetNames.flatMap(sheetName => {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1, defval: "", raw: false,
    }).map(row => row.map(value => String(value ?? "").trim()));
    const normalized = matrix.map(row => row.map(cleanHeader));
    const findCell = (aliases: string[], startRow = 0, endRow = matrix.length) => {
      for (let row = startRow; row < Math.min(endRow, matrix.length); row += 1) {
        for (let col = 0; col < (normalized[row]?.length || 0); col += 1) {
          const cell = normalized[row][col];
          if (aliases.some(alias => cell === alias || cell.includes(alias))) return { row, col };
        }
      }
      return undefined;
    };
    const rightValue = (aliases: string[], startRow = 0, endRow = matrix.length, maxDistance = 4) => {
      const cell = findCell(aliases, startRow, endRow);
      if (!cell) return "";
      for (let distance = 1; distance <= maxDistance; distance += 1) {
        const value = matrix[cell.row]?.[cell.col + distance]?.trim();
        if (value) return value;
      }
      return "";
    };
    const belowValue = (aliases: string[], maxRows = 4) => {
      const cell = findCell(aliases);
      if (!cell) return "";
      for (let distance = 1; distance <= maxRows; distance += 1) {
        const value = matrix[cell.row + distance]?.[cell.col]?.trim();
        if (value) return value;
      }
      return "";
    };
    const personalSection = findCell(["dados pessoais"]);
    const beneficiarySection = findCell(["beneficiarios"]);
    const personalStart = personalSection ? personalSection.row + 1 : 0;
    const personalEnd = beneficiarySection?.row ?? matrix.length;
    const clientName = rightValue(["nome completo"], personalStart, personalEnd);
    if (!clientName) return [];

    const premiumAmount = money(belowValue(["premium", "premio"]));
    const premiumFrequency = rightValue(["frequencia", "frequency", "modal"], 0, personalStart) || "Mensal";
    const targetPremium = premiumAmount * 12;
    const productRows = matrix.slice(0, personalStart).filter(row => row.some(value => /\(\s*x\s*\)/i.test(value)));
    const productText = productRows.flat().join(" ");
    const product = /term|temporar/i.test(productText) ? "Term Life"
      : /iul|indexad/i.test(productText) ? "IUL"
      : /whole\s*life|vida inteira/i.test(productText) ? "Whole Life" : "";
    const beneficiaryStart = beneficiarySection?.row ?? matrix.length;
    const beneficiaries: string[] = [];
    for (let row = beneficiaryStart; row < Math.min(beneficiaryStart + 12, matrix.length); row += 1) {
      const nameLabel = normalized[row]?.findIndex(value => value === "nome completo");
      if (nameLabel === undefined || nameLabel < 0) continue;
      const name = matrix[row].slice(nameLabel + 1, nameLabel + 5).find(Boolean) || "";
      const relationship = matrix[row + 1]?.slice(0, 6).filter(Boolean).at(-1) || "";
      if (name) beneficiaries.push(relationship ? `${name} (${relationship})` : name);
    }
    const applicationDate = rightValue(["data da proposta", "data aplicacao", "application date"], 0, personalStart)
      || belowValue(["data da proposta", "data aplicacao", "application date"], 2);
    const policyNumber = belowValue(["apolice n", "numero apolice", "policy number"]);
    const coverageAmount = money(belowValue(["valor da apolice", "valor cobertura", "coverage", "face amount"]));
    return [{
      clientName,
      clientEmail: rightValue(["email", "e mail"], personalStart, personalEnd),
      clientPhone: rightValue(["telefone", "celular", "phone", "whatsapp"], personalStart, personalEnd),
      birthDate: spreadsheetBirthDate(rightValue(["data de nascimento", "data nascimento", "date of birth", "dob"], personalStart, personalEnd)),
      policyNumber, product, policyStatus: "active" as const,
      premiumAmount, premiumFrequency, targetPremium,
      points: Math.round(targetPremium), coverageAmount,
      beneficiaries: beneficiaries.join("; "),
      issuedAt: spreadsheetDate(applicationDate) || fileCreationDate,
    } satisfies SpreadsheetRow];
  });

  const all = [...fromTable, ...fromForms];
  const unique = new Map<string, SpreadsheetRow>();
  for (const row of all) {
    const key = `${cleanHeader(row.clientName)}|${row.policyNumber.toLowerCase()}`;
    const current = unique.get(key);
    unique.set(key, current ? {
      ...current,
      ...Object.fromEntries(Object.entries(row).map(([field, value]) => [field, value || current[field as keyof SpreadsheetRow]])),
    } as SpreadsheetRow : row);
  }
  return Array.from(unique.values());
}
export async function readPcSheet(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const pdf = await pdfjs.getDocument({
    data: await file.arrayBuffer(),
    password: "",
    stopAtErrors: false,
  }).promise;
  const pageLines: string[][] = [];
  const rawPages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i),
      content = await page.getTextContent();
    const rows = new Map<number, { x: number; text: string }[]>();
    const rawItems: string[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim() || !("transform" in item))
        continue;
      rawItems.push(item.str.trim());
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
    rawPages.push(rawItems.join(" "));
  }
  const pages = pageLines.map(lines => lines.join("\n")),
    visualText = pages.join("\n").replace(/[ \t]+/g, " "),
    rawText = rawPages.join("\n").replace(/[ \t]+/g, " "),
    all = `${visualText}\n${rawText}`,
    coverIndex = pages.findIndex(page =>
      /Life Insurance Application Cover Sheet|Application Cover Sheet/i.test(
        page
      )
    ),
    cover = pageLines[Math.max(coverIndex, 0)] || [];
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
    afterLine(cover, /Transaction ID/i) ||
    find(all, /\b(LS\s*\d{6,})\b/i).replace(/\s/g, "");
  let product =
    afterLine(cover, /^Product:/i) ||
    find(all, /Product Name:[^\n]*\n([^|\n]+)/i);
  let coverage =
    afterLine(cover, /Face Amount/i) ||
    find(all, /Face Amount:[^\n]*\n([^|\n]*\$[\d,]+)/i);
  let name =
    afterLine(cover, /Proposed Insured:.*Agent:/i) ||
    afterLine(cover, /^Proposed Insured:?$/i) ||
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
  const targetPremiumText = find(
    all,
    /Target Premium[^$\d]{0,40}\$?\s*([\d,]+(?:\.\d{2})?)/i
  );
  const applicationDate = extractApplicationDate(all);
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
  const nationalLife =
    /National Life Insurance Company|Life Insurance Company of the Southwest|National Life Group/i.test(
      all
    );
  if (nationalLife) {
    const nationalCover = cover.join("\n");
    name =
      afterLine(cover, /Proposed Insured:.*Agent:/i)
        .split("|")[0]
        .trim() || name;
    policy =
      afterLine(cover, /Transaction ID/i)
        .split("|")[0]
        .replace(/\s/g, "") || policy;
    product =
      afterLine(cover, /^Product:/i)
        .split("|")[0]
        .trim() || product;
    coverage =
      afterLine(cover, /Face Amount/i)
        .split("|")[0]
        .trim() || coverage;
    dob =
      find(nationalCover, /Proposed Insured\s*\nDOB:\s*\n?([^\n|]+)/i).match(
        /\d{1,2}\/\d{1,2}\/\d{4}/
      )?.[0] || dob;
  }
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
  const targetPremium = targetPremiumText
    ? money(targetPremiumText)
    : money(premium) * 12;
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
    targetPremium,
    points: Math.round(targetPremium),
    coverageAmount: money(coverage),
    beneficiaries: Array.from(new Set(beneficiaries)).join(", "),
    issuedAt: applicationDate,
  };
}
export function PcSheetUpload() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const save = trpc.agent.savePcSheet.useMutation();
  const importSpreadsheet = trpc.agent.importSpreadsheet.useMutation();
  const utils = trpc.useUtils();
  return (
    <Card className="border-gold/20 bg-[#0b1524] p-6">
      <div className="rounded-xl border border-dashed border-gold/40 bg-black/30 p-6 text-center">
        <Upload className="mx-auto text-gold" />
        <p className="mt-3 font-bold">Selecione um PC Sheet em PDF ou uma ficha em Excel</p>
        <p className="mt-1 text-xs text-gray-400">
          O sistema identifica automaticamente PDF, Excel ou CSV. Dados bancários,
          SSN e informações médicas são ignorados.
        </p>
        <Input
          className="mx-auto mt-4 max-w-md"
          type="file"
          accept=".pdf,.xlsx,.xls,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.currentTarget.value = "";
            setLoading(true);
            try {
              const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
              if (!isPdf) {
                const rows = await readClientSpreadsheet(file);
                if (!rows.length) throw new Error("Não foi possível identificar nenhum cliente nesta planilha");
                setForm({ ...empty, ...rows[0] });
                const result = await importSpreadsheet.mutateAsync({ rows });
                await Promise.all([
                  utils.agent.listPolicies.invalidate(),
                  utils.agent.listClients.invalidate(),
                  utils.agent.dashboard.invalidate(),
                ]);
                toast.success(`${rows.length} cadastro(s) identificado(s) e salvos. ${result.createdClients} cliente(s) criado(s) e ${result.updatedClients} completado(s).`);
                return;
              }
              const extracted = await readPcSheet(file);
              setForm(extracted);
              const filled = Object.values(extracted).filter(
                value => value !== "" && value !== 0
              ).length;
              if (!extracted.clientName || !extracted.policyNumber)
                toast.error(
                  "O texto foi lido, mas não foi possível identificar nome e número da apólice. Confira os campos abaixo ou tente o PDF original."
                );
              else {
                const result = await save.mutateAsync(extracted);
                await Promise.all([
                  utils.agent.listPolicies.invalidate(),
                  utils.agent.listMessages.invalidate(),
                  utils.agent.listTasks.invalidate(),
                  utils.agent.listClients.invalidate(),
                ]);
                toast.success(
                  `${filled} campos extraídos e salvos automaticamente. ${result.automationCount ?? 0} mensagens e acompanhamentos programados.`
                );
              }
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Não foi possível ler e salvar este arquivo");
            } finally {
              setLoading(false);
            }
          }}
        />
        {loading && (
          <p className="mt-3 text-sm text-gold">Lendo e salvando arquivo...</p>
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
          Target premium anual
          <Input
            className="mt-2"
            type="number"
            step=".01"
            value={form.targetPremium || ""}
            onChange={e => {
              const targetPremium = Number(e.target.value);
              setForm({
                ...form,
                targetPremium,
                points: Math.round(targetPremium),
              });
            }}
          />
          <p className="mt-1 text-xs text-gray-500">
            Normalmente é o premium mensal multiplicado por 12.
          </p>
        </label>
        <label className="text-sm text-gray-300">
          Pontos anuais
          <Input
            className="mt-2"
            type="number"
            step="1"
            min="0"
            value={form.points || ""}
            onChange={e =>
              setForm({ ...form, points: Math.round(Number(e.target.value)) })
            }
          />
          <p className="mt-1 text-xs text-gray-500">
            Ajustável para apólices com cálculo diferente.
          </p>
        </label>
        <label className="text-sm text-gray-300">
          Data da aplicação
          <Input
            className="mt-2"
            type="date"
            value={form.issuedAt}
            onChange={e => setForm({ ...form, issuedAt: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Extraída do campo “Date and Time eSigned” do PC Sheet, sem o
            horário. Usada para a revisão anual e o aviso ao agente.
          </p>
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
        <p className="rounded-lg border border-gold/20 bg-gold/10 p-3 text-sm text-gold md:col-span-2">
          {save.isPending
            ? "Salvando cliente, apólice e automações..."
            : "O cadastro é salvo automaticamente assim que o PC Sheet termina de ser lido."}
        </p>
      </div>
    </Card>
  );
}
export function SpreadsheetUpload() {
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);
  const importer = trpc.agent.importSpreadsheet.useMutation();
  const utils = trpc.useUtils();
  const clear = () => { setRows([]); setFileName(""); };
  const readFile = async (file: File) => {
    setReading(true);
    try {
      const parsed = await readClientSpreadsheet(file);
      if (!parsed.length) throw new Error("Nenhuma coluna de nome foi encontrada");
      setRows(parsed);
      setFileName(file.name);
      toast.success(`${parsed.length} cadastro(s) identificado(s). Confira antes de importar.`);
    } catch (error) {
      clear();
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a planilha");
    } finally {
      setReading(false);
    }
  };
  return (
    <Card className="border-gold/20 bg-[#0b1524] p-6">
      <div className="rounded-xl border border-dashed border-emerald-400/40 bg-emerald-500/5 p-6 text-center">
        <FileSpreadsheet className="mx-auto text-emerald-300" />
        <p className="mt-3 font-bold">Importar clientes por Excel</p>
        <p className="mx-auto mt-1 max-w-2xl text-xs text-gray-400">
          Aceita .xlsx, .xls e .csv. Use uma linha por cliente. O sistema cria novos cadastros e apenas completa campos vazios dos já existentes; os dados do PC Sheet têm prioridade.
        </p>
        <Input
          className="mx-auto mt-4 max-w-md"
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          disabled={reading || importer.isPending}
          onChange={event => { const file = event.target.files?.[0]; if (file) void readFile(file); event.currentTarget.value = ""; }}
        />
        <p className="mt-3 text-xs text-gray-500">
          Colunas reconhecidas: Nome, E-mail, Telefone, Nascimento, Nº da apólice, Produto, Status, Premium, Frequência, Target Premium, Pontos, Cobertura, Beneficiários e Data da aplicação.
        </p>
      </div>
      {rows.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-bold text-gold">Conferência antes da importação</p><p className="text-sm text-gray-400">{fileName} · {rows.length} linha(s)</p></div>
            <Button type="button" variant="outline" size="sm" onClick={clear}><X className="mr-2 h-4 w-4" />Cancelar</Button>
          </div>
          <div className="max-h-72 overflow-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-[#101d30] text-gray-300"><tr><th className="p-3">Cliente</th><th className="p-3">Contato</th><th className="p-3">Apólice</th><th className="p-3">Status</th><th className="p-3">Premium</th><th className="p-3">Cobertura</th></tr></thead>
              <tbody>{rows.map((row, index) => <tr key={`${row.clientName}-${index}`} className="border-t border-white/10"><td className="p-3 font-semibold">{row.clientName}</td><td className="p-3 text-gray-400">{row.clientEmail || row.clientPhone || "—"}</td><td className="p-3">{row.policyNumber || "Somente cliente"}</td><td className="p-3">{{ active: "Ativa", lapse: "Lapse", declined: "Recusada", cancelled: "Cancelada" }[row.policyStatus]}</td><td className="p-3">${row.premiumAmount.toFixed(2)}</td><td className="p-3">${row.coverageAmount.toLocaleString()}</td></tr>)}</tbody>
            </table>
          </div>
          <Button
            className="w-full bg-gold text-black"
            disabled={importer.isPending}
            onClick={async () => {
              try {
                const result = await importer.mutateAsync({ rows });
                await Promise.all([utils.agent.listPolicies.invalidate(), utils.agent.listClients.invalidate(), utils.agent.dashboard.invalidate()]);
                toast.success(`${result.createdClients} cliente(s) criado(s), ${result.updatedClients} completado(s), ${result.createdPolicies} apólice(s) criada(s) e ${result.updatedPolicies} completada(s).`);
                clear();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Não foi possível importar a planilha");
              }
            }}
          >{importer.isPending ? "Importando e conferindo duplicidades..." : `Importar ${rows.length} cadastro(s)`}</Button>
        </div>
      )}
    </Card>
  );
}
export default function AgentPolicies({
  uploadOnly = false,
}: {
  uploadOnly?: boolean;
}) {
  const q = trpc.agent.listPolicies.useQuery();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<
    "name" | "date" | "type" | "coverage" | "premium"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const policies = useMemo(() => {
    const term = search.trim().toLowerCase();
    const valueFor = (policy: NonNullable<typeof q.data>[number]) => {
      if (sortKey === "date") return String(policy.issuedAt || "");
      if (sortKey === "type") return String(policy.product || "").toLowerCase();
      if (sortKey === "coverage") return Number(policy.coverageAmount || 0);
      if (sortKey === "premium") return Number(policy.premiumAmount || 0);
      return String(policy.clientName || "").toLowerCase();
    };
    return (q.data || [])
      .filter(policy =>
        `${policy.clientName} ${policy.policyNumber} ${policy.product || ""} ${policy.issuedAt || ""} ${policy.coverageAmount || ""} ${policy.premiumAmount || ""}`
          .toLowerCase()
          .includes(term)
      )
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
  }, [q.data, search, sortKey, sortDirection]);
  const changeSort = (key: typeof sortKey) => {
    if (sortKey === key)
      setSortDirection(current => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };
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
            <Card className="border-gold/20 bg-[#0b1524] p-4">
              <div className="relative">
                <Search
                  className="absolute left-3 top-3 text-gray-500"
                  size={17}
                />
                <Input
                  className="pl-10"
                  placeholder="Buscar por cliente, número, tipo, data ou valor"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
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
            {policies.map(p => (
              <Card key={p.id} className="border-gold/20 bg-[#0b1524] p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{p.clientName}</h2>
                    <p className="text-sm text-gray-400">
                      {p.policyNumber} · {p.product || "Produto não informado"}
                    </p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${String(p.status || "active") === "active" ? "bg-emerald-500/15 text-emerald-300" : String(p.status) === "lapse" ? "bg-amber-500/15 text-amber-300" : "bg-red-500/15 text-red-300"}`}>
                      {({ active: "Ativa", lapse: "Lapse", declined: "Recusada", cancelled: "Cancelada" } as const)[String(p.status || "active") as "active" | "lapse" | "declined" | "cancelled"]}
                    </span>
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
                    Target premium:{" "}
                    <b>${Number(p.targetPremium || 0).toFixed(2)}</b>
                  </span>
                  <span>
                    Pontos contabilizados: <b>{String(p.status || "active") === "active" ? Math.round(Number(p.points || 0)) : 0}</b>
                  </span>
                  <span>
                    Cobertura:{" "}
                    <b>${Number(p.coverageAmount || 0).toLocaleString()}</b>
                  </span>
                  <span>
                    Beneficiário: <b>{p.beneficiaries || "Não informado"}</b>
                  </span>
                  <span>
                    Data da aplicação:{" "}
                    <b>
                      {p.issuedAt
                        ? new Date(
                            `${String(p.issuedAt).slice(0, 10)}T12:00:00`
                          ).toLocaleDateString("en-US")
                        : "Não informada"}
                    </b>
                  </span>
                </div>
              </Card>
            ))}
            {policies.length === 0 && (
              <Card className="border-white/10 bg-[#0b1524] p-8 text-center text-gray-400">
                {q.data?.length
                  ? "Nenhuma apólice encontrada."
                  : "Nenhuma apólice cadastrada."}
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
