import { describe, expect, it } from "vitest";
import {
  flexLifeReviewDates,
  isFlexLifeProduct,
} from "../shared/flexLifeReviewTemplate";

describe("Flex Life review automation", () => {
  it("schedules the review at 13 months and the notice 15 days earlier", () => {
    const dates = flexLifeReviewDates("2026-01-10T12:00:00Z");
    expect(dates?.reviewAt.toISOString().slice(0, 10)).toBe("2027-02-10");
    expect(dates?.noticeAt.toISOString().slice(0, 10)).toBe("2027-01-26");
  });

  it("keeps end-of-month application dates valid", () => {
    const dates = flexLifeReviewDates("2026-01-31T12:00:00Z");
    expect(dates?.reviewAt.toISOString().slice(0, 10)).toBe("2027-02-28");
  });

  it("only identifies Flex Life products", () => {
    expect(isFlexLifeProduct("Flex Life II")).toBe(true);
    expect(isFlexLifeProduct("Secure Whole Life")).toBe(false);
  });
});
