import { describe, expect, it } from "vitest";
import { extractIssuedPolicyData } from "../shared/issuedPolicy";

describe("issued policy extraction", () => {
  it("reads the authoritative Data Section of Agustin's issued policy", () => {
    const text = `Data Section
Insured: AGUSTIN PONS Policy Number: 786280700
Issue Age and Sex: 30 Male Face Amount: $642,490
Date of Issue: March 1, 2025 Expiry Date: March 1, 2090
Payment Mode: Monthly (EFT) Premium Payment: $36.00
Individual Term Life Insurance to Age 95
Level Premium Period: 20 Year`;
    expect(extractIssuedPolicyData(text)).toEqual({
      policyNumber: "786280700",
      clientName: "AGUSTIN PONS",
      coverage: "$642,490",
      premium: "$36.00",
      issuedAt: "March 1, 2025",
      product: "Individual Term Life Insurance to Age 95",
    });
  });
});
