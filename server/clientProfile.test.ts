import { describe, expect, it } from "vitest";
import { missingClientProfileFields } from "../shared/clientProfile";

describe("missingClientProfileFields", () => {
  it("lists missing personal and policy data", () => {
    expect(
      missingClientProfileFields(
        { email: "", phone: "555", birthDate: null },
        [{ policyNumber: "LS1", product: "IUL", issuedAt: null, premiumAmount: 100, targetPremium: 1200, coverageAmount: 0, beneficiaries: "" }]
      )
    ).toEqual(["e-mail", "data de nascimento", "data da aplicação", "cobertura", "beneficiários"]);
  });

  it("reports a missing policy", () => {
    expect(
      missingClientProfileFields(
        { email: "a@example.com", phone: "555", birthDate: "2000-01-01" },
        []
      )
    ).toEqual(["apólice"]);
  });
});
