type ProfileRecord = Record<string, unknown>;

const present = (value: unknown) =>
  value !== null && value !== undefined && String(value).trim() !== "";
const positive = (value: unknown) => Number(value || 0) > 0;
const inactivePolicyStatuses = new Set([
  "inactive",
  "inativa",
  "lapse",
  "lapsed",
  "cancelled",
  "canceled",
  "cancelada",
  "declined",
  "recusada",
  "surrendered",
  "terminated",
  "expired",
]);
const isActivePolicy = (policy: ProfileRecord) =>
  !inactivePolicyStatuses.has(
    String(policy.status || "").trim().toLowerCase()
  );

export function missingClientProfileFields(
  client: ProfileRecord,
  policies: ProfileRecord[]
) {
  const activePolicies = policies.filter(isActivePolicy);
  if (policies.length > 0 && activePolicies.length === 0) return [];

  const missing: string[] = [];
  if (!present(client.email)) missing.push("e-mail");
  if (!present(client.phone)) missing.push("telefone");
  if (!present(client.birthDate)) missing.push("data de nascimento");
  if (!policies.length) return [...missing, "apólice"];

  activePolicies.forEach((policy, index) => {
    const suffix = activePolicies.length > 1 ? ` (apólice ${index + 1})` : "";
    if (!present(policy.policyNumber)) missing.push(`número da apólice${suffix}`);
    if (!present(policy.product)) missing.push(`produto${suffix}`);
    if (!present(policy.issuedAt)) missing.push(`data da aplicação${suffix}`);
    if (!positive(policy.premiumAmount)) missing.push(`premium${suffix}`);
    if (!positive(policy.targetPremium)) missing.push(`target premium${suffix}`);
    if (!positive(policy.coverageAmount)) missing.push(`cobertura${suffix}`);
    if (!present(policy.beneficiaries)) missing.push(`beneficiários${suffix}`);
  });
  return missing;
}
