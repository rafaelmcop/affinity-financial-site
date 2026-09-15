const capture = (text: string, pattern: RegExp) =>
  text.match(pattern)?.[1]?.replace(/\s*\|\s*/g, " ").trim() || "";

export function extractIssuedPolicyData(text: string) {
  return {
    policyNumber: capture(
      text,
      /Policy (?:Number|No\.?):\s*(?:\|\s*)?((?:NL|LSW?|LS)?\s*\d{6,})/i
    ).replace(/\s/g, ""),
    clientName: capture(
      text,
      /Insured(?:'s Name)?\s*:\s*(?:\|\s*)?([A-ZÀ-Ÿ][A-ZÀ-Ÿ' -]{2,}?)(?=\s+(?:Policy (?:Number|No\.?):|Issue Age(?: and Sex)?:|Face Amount|Effective Date:|Date of Issue:|Sex:|\n))/i
    ),
    coverage: capture(
      text,
      /Face Amount(?:\s*[–-]\s*Base Coverage)?\s*:\s*(?:\|\s*)?(\$?[\d,]+(?:\.\d{2})?)/i
    ),
    premium: capture(
      text,
      /(?:Planned Periodic Premium|Premium Payment)\s*:\s*(?:\|\s*)?(\$?[\d,]+(?:\.\d{2})?)/i
    ),
    issuedAt:
      capture(text, /(?:Date of Issue|Effective Date):\s*(?:\|\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
      capture(text, /(?:Date of Issue|Effective Date):\s*(?:\|\s*)?([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i),
    product: capture(
      text,
      /(Individual\s+(?:Flexible Premium Adjustable Benefit|Term|Whole|Universal|Indexed)[A-Za-z -]*Life Insurance(?:\s+to Age\s+\d+)?)/i
    ),
  };
}
