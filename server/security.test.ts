import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("protected business procedures", () => {
  it("rejects anonymous administrative access", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.admin.getStats()).rejects.toMatchObject<Partial<TRPCError>>({
      code: "FORBIDDEN",
    });
  });

  it("rejects anonymous affiliate dashboard access", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.affiliate.getDashboard({ affiliateId: 1 })).rejects.toMatchObject<Partial<TRPCError>>({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects anonymous email dispatch", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.notification.sendAffiliateRegistrationEmail({
      email: "person@example.com",
      name: "Person",
    })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });
});
