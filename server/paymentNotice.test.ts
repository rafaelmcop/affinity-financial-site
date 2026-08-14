import { describe, expect, it } from "vitest";
import { classifyPaymentNotice, extractPolicyNumbers } from "../shared/paymentNotice";

describe("payment notice recognition", () => {
  it("recognizes a returned payment and policy number", () => {
    expect(classifyPaymentNotice("Returned Payment Notification", "Policy Number: NL-7926879 was returned NSF")).toBe("attention");
    expect([...extractPolicyNumbers("Returned Payment Notification", "Policy Number: NL-7926879 was returned NSF")]).toContain("NL7926879");
  });

  it("recognizes a confirmed premium payment", () => {
    expect(classifyPaymentNotice("Premium payment received", "Policy #ABC12345 has been processed successfully")).toBe("confirmed");
    expect([...extractPolicyNumbers("Premium payment received", "Policy #ABC12345 has been processed successfully")]).toContain("ABC12345");
  });

  it("ignores unrelated messages", () => {
    expect(classifyPaymentNotice("Welcome", "Your document is ready")).toBeNull();
  });
});
