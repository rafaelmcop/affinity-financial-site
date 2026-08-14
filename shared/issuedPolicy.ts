const capture = (text: string, pattern: RegExp) =>
  text.match(pattern)?.[1]?.replace(/\s*\|\s*/g, " ").trim() || "";

export function extractIssuedPolicyData(text: string) {
  return {
    policyNumber: capture(text, /Policy Number:\s*(?:\|\s*)?(\d{6,})/i),
    clientName: capture(
      text,
      /Insured:\s*(?:\|\s*)?([A-ZÀ-Ÿ][A-ZÀ-Ÿ' -]{2,}?)(?=\s+(?:Policy Number:|Issue Age(?: and Sex)?:|Face Amount:|Date of Issue:|\n))/i
    ),
    coverage: capture(
      text,
      /Face Amount:\s*(?:\|\s*)?(\$?[\d,]+(?:\.\d{2})?)/i
    ),
    premium: capture(
      text,
      /Premium Payment:\s*(?:\|\s*)?(\$?[\d,]+(?:\.\d{2})?)/i
    ),
    issuedAt:
      capture(text, /Date of Issue:\s*(?:\|\s*)?(\d{1,2}\/\d{1,2}\/\d{4})/i) ||
      capture(text, /Date of Issue:\s*(?:\|\s*)?([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i),
    product: capture(
      text,
      /(Individual\s+(?:Term|Whole|Universal|Indexed)[A-Za-z ]*Life Insurance(?:\s+to Age\s+\d+)?)/i
    ),
  };
}
