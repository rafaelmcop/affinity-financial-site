export const normalizePolicyNumber = (value: unknown) =>
  String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function classifyPaymentNotice(subject: string, body: string) {
  const text = `${subject}\n${body}`.toLowerCase();
  if (!/(payment|premium|billing|bank draft|pagamento|cobrança|cobranca)/i.test(text))
    return null;
  if (/(return(?:ed)?|declin(?:e|ed)|fail(?:ed|ure)?|insufficient|nsf|revers(?:ed|al)|unable to process|past due|não processado|nao processado|recusado|devolvido)/i.test(text))
    return "attention" as const;
  if (/(received|successful|processed|paid|posted|thank you for your payment|confirmado|recebido|processado)/i.test(text))
    return "confirmed" as const;
  return "review" as const;
}

export function extractPolicyNumbers(subject: string, body: string) {
  const text = `${subject}\n${body}`;
  const values = new Set<string>();
  const patterns = [
    /(?:policy|ap[oó]lice|contract|certificate)\s*(?:number|no\.?|#|n[º°o]|n[uú]mero)?\s*[:#-]?\s*([A-Z0-9-]{5,30})/gi,
    /(?:policy|ap[oó]lice)\s*[:#-]\s*([A-Z0-9-]{5,30})/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)))
      values.add(normalizePolicyNumber(match[1]));
  }
  return values;
}
