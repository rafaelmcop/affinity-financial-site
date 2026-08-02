import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const affiliateProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { getAffiliateSessionId } = await import("../sessionAuth");
    const affiliateId = await getAffiliateSessionId(opts.ctx.req);
    if (!affiliateId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    return opts.next({ ctx: { ...opts.ctx, affiliateId } });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    const { hasAdminSession } = await import("../sessionAuth");
    const hasLocalAdminSession = await hasAdminSession(ctx.req);
    if ((!ctx.user || ctx.user.role !== 'admin') && !hasLocalAdminSession) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
