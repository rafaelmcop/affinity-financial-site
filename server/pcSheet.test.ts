import { describe, expect, it } from "vitest";
import { extractApplicationDate } from "../shared/pcSheet";

describe("extractApplicationDate", () => {
  it("reads Date and Time eSigned and discards the time", () => {
    expect(
      extractApplicationDate(
        "Role: Proposed Insured Date and Time eSigned: 08/05/2026 14:59:51 GMT eSignature Method: Face to Face"
      )
    ).toBe("2026-08-05");
  });

  it("accepts line breaks and common label variations", () => {
    expect(extractApplicationDate("Date & Time e-Signed:\n9/7/2025 8:30 AM"))
      .toBe("2025-09-07");
  });

  it("accepts the visual column separator produced by the real PC Sheet", () => {
    expect(
      extractApplicationDate(
        "Name: | Adneia De Oliveira Carias | Role: | Proposed Insured Date and Time eSigned: | 08/05/2026 14:59:51 GMT | eSignature Method:"
      )
    ).toBe("2026-08-05");
  });

  it("falls back to the signed-by line when the label is detached", () => {
    expect(
      extractApplicationDate(
        "e-Signed by Adneia De Oliveira Carias 08/05/2026 14:59:51 GMT"
      )
    ).toBe("2026-08-05");
  });

  it("does not use policy, issue or effective dates", () => {
    expect(
      extractApplicationDate(
        "Policy Date: 08/20/2026 Issue Date: 08/21/2026 Effective Date: 08/22/2026"
      )
    ).toBe("");
  });
});
