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

  it("does not use policy, issue or effective dates", () => {
    expect(
      extractApplicationDate(
        "Policy Date: 08/20/2026 Issue Date: 08/21/2026 Effective Date: 08/22/2026"
      )
    ).toBe("");
  });
});
