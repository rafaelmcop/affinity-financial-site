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

  it("does not request missing data when every policy is inactive", () => {
    expect(
      missingClientProfileFields(
        { email: "", phone: "", birthDate: null },
        [
          {
            status: "lapse",
            policyNumber: "LS1",
            product: "",
            issuedAt: null,
            premiumAmount: 0,
            targetPremium: 0,
            coverageAmount: 0,
            beneficiaries: "",
          },
        ]
      )
    ).toEqual([]);
  });

  it("checks only active policies when statuses are mixed", () => {
    expect(
      missingClientProfileFields(
        { email: "a@example.com", phone: "555", birthDate: "2000-01-01" },
        [
          { status: "cancelled", policyNumber: "OLD", product: "" },
          {
            status: "active",
            policyNumber: "NEW",
            product: "IUL",
            issuedAt: null,
            premiumAmount: 100,
            targetPremium: 1200,
            coverageAmount: 100000,
            beneficiaries: "Maria",
          },
        ]
      )
    ).toEqual(["data da aplicação"]);
  });
});
