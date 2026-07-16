import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  affiliate: router({
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const { getAffiliateByEmail } = await import('./db');
        const { verifyPassword } = await import('./auth');

        const affiliate = await getAffiliateByEmail(input.email);
        if (!affiliate || !verifyPassword(input.password, affiliate.passwordHash)) {
          throw new Error('Invalid email or password');
        }

        if (!affiliate.isActive) {
          throw new Error('Affiliate account is not active');
        }

        return {
          id: affiliate.id,
          email: affiliate.email,
          name: affiliate.name,
          affiliateCode: affiliate.affiliateCode,
          commissionRate: affiliate.commissionRate,
        };
      }),

    getDashboard: publicProcedure
      .input(z.object({
        affiliateId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getAffiliateById, getAffiliateReferrals } = await import('./db');

        const affiliate = await getAffiliateById(input.affiliateId);
        if (!affiliate) {
          throw new Error('Affiliate not found');
        }

        const referrals = await getAffiliateReferrals(input.affiliateId);

        const stats = {
          totalReferrals: referrals.length,
          convertedReferrals: referrals.filter(r => r.status === 'converted').length,
          pendingReferrals: referrals.filter(r => r.status === 'pending').length,
          totalCommission: referrals
            .filter(r => r.status === 'converted')
            .reduce((sum, r) => sum + (parseFloat(r.commissionAmount?.toString() || '0')), 0),
        };

        return {
          affiliate,
          referrals,
          stats,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
