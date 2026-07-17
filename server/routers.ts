import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { publicProcedure, router } from './_core/trpc';
import { affiliates } from '../drizzle/schema';
import { COOKIE_NAME } from '../shared/const';
import { getSessionCookieOptions } from './_core/cookies';

// Notification routes (internal use)
const notificationRouter = router({
  sendAffiliateRegistrationEmail: publicProcedure
    .input(z.object({ email: z.string().email(), name: z.string() }))
    .mutation(async ({ input }) => {
      const { sendAffiliateRegistrationEmail } = await import('./notifications');
      const success = await sendAffiliateRegistrationEmail(input.email, input.name);
      return { success };
    }),

  sendAffiliateApprovalEmail: publicProcedure
    .input(z.object({ email: z.string().email(), name: z.string(), affiliateCode: z.string() }))
    .mutation(async ({ input }) => {
      const { sendAffiliateApprovalEmail } = await import('./notifications');
      const success = await sendAffiliateApprovalEmail(input.email, input.name, input.affiliateCode);
      return { success };
    }),

  sendPolicyApprovalEmail: publicProcedure
    .input(z.object({ email: z.string().email(), clientName: z.string(), policyNumber: z.string(), points: z.number() }))
    .mutation(async ({ input }) => {
      const { sendPolicyApprovalEmail } = await import('./notifications');
      const success = await sendPolicyApprovalEmail(input.email, input.clientName, input.policyNumber, input.points);
      return { success };
    }),

  sendCommissionCreditEmail: publicProcedure
    .input(z.object({ email: z.string().email(), name: z.string(), amount: z.number(), policyNumber: z.string() }))
    .mutation(async ({ input }) => {
      const { sendCommissionCreditEmail } = await import('./notifications');
      const success = await sendCommissionCreditEmail(input.email, input.name, input.amount, input.policyNumber);
      return { success };
    }),

  sendAdminNotificationEmail: publicProcedure
    .input(z.object({ policyNumber: z.string(), clientName: z.string(), affiliateName: z.string() }))
    .mutation(async ({ input }) => {
      const { sendAdminNotificationEmail } = await import('./notifications');
      const success = await sendAdminNotificationEmail(input.policyNumber, input.clientName, input.affiliateName);
      return { success };
    }),
});

// Main app router
export const appRouter = router({
  system: router({
    ping: publicProcedure.query(() => 'pong' as const),
  }),

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
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        company: z.string().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { getAffiliateByEmail, createAffiliate } = await import('./db');
        const { hashPassword, generateAffiliateCode } = await import('./auth');

        const existing = await getAffiliateByEmail(input.email);
        if (existing) {
          throw new Error('Email já cadastrado');
        }

        const affiliateCode = generateAffiliateCode();
        const passwordHash = hashPassword(input.password);

        await createAffiliate({
          email: input.email,
          passwordHash,
          name: input.name,
          company: input.company || null,
          phone: input.phone || null,
          commissionRate: '10.00',
          affiliateCode,
          isActive: 1,
          status: 'pending',
        });

        return {
          success: true,
          message: 'Conta criada com sucesso! Aguarde aprovação.',
        };
      }),

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

        if (affiliate.status !== 'approved') {
          throw new Error('Sua conta ainda não foi aprovada');
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
        const { getAffiliateById, getAffiliateReferrals, getPoliciesByAffiliateId, getPoliciesLast12Months } = await import('./db');

        const affiliate = await getAffiliateById(input.affiliateId);
        if (!affiliate) {
          throw new Error('Affiliate not found');
        }

        const referrals = await getAffiliateReferrals(input.affiliateId);
        const policies = await getPoliciesByAffiliateId(input.affiliateId);
        const policiesLast12 = await getPoliciesLast12Months(input.affiliateId);

        const totalPoints = policiesLast12.reduce((sum, p) => sum + (p.points || 0), 0);

        const stats = {
          totalReferrals: referrals.length,
          convertedReferrals: referrals.filter(r => r.status === 'converted').length,
          pendingReferrals: referrals.filter(r => r.status === 'pending').length,
          totalCommission: referrals
            .filter(r => r.status === 'converted')
            .reduce((sum, r) => sum + (parseFloat(r.commissionAmount?.toString() || '0')), 0),
          totalPolicies: policies.length,
          totalPoints,
        };

        return {
          affiliate,
          referrals,
          policies,
          stats,
        };
      }),

    submitPolicy: publicProcedure
      .input(z.object({
        affiliateId: z.number(),
        policyNumber: z.string().min(1),
        clientName: z.string().min(1),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        policyType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { createPolicy } = await import('./db');

        const policy = await createPolicy({
          affiliateId: input.affiliateId,
          policyNumber: input.policyNumber,
          clientName: input.clientName,
          clientEmail: input.clientEmail || null,
          clientPhone: input.clientPhone || null,
          policyType: input.policyType,
          status: 'pending',
          points: 0,
          submittedAt: new Date(),
          approvedAt: null,
        });

        return {
          success: true,
          message: 'Apólice submetida com sucesso! Aguarde aprovação.',
        };
      }),
  }),

  admin: router({
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const ADMIN_EMAIL = 'us.rafael@icloud.com';
        const ADMIN_PASSWORD = 'Agnus_69$';

        if (input.email !== ADMIN_EMAIL || input.password !== ADMIN_PASSWORD) {
          throw new Error('Credenciais inválidas');
        }

        return {
          id: 1,
          email: ADMIN_EMAIL,
          name: 'Administrador',
          role: 'admin',
        };
      }),

    getStats: publicProcedure
      .query(async () => {
        const { getAdminStats, getPoliciesByStatus, getCommissionsByAffiliate } = await import('./db');

        const stats = await getAdminStats();
        const pendingPolicies = await getPoliciesByStatus('pending');
        const approvedPolicies = await getPoliciesByStatus('approved');
        const commissions = await getCommissionsByAffiliate();

        const totalCommissions = commissions.reduce((sum, c) => sum + (parseFloat(c.commissionAmount?.toString() || '0')), 0);

        return {
          ...stats,
          pendingPolicies: pendingPolicies.length,
          approvedPolicies: approvedPolicies.length,
          totalCommissions,
        };
      }),

    getPoliciesPending: publicProcedure
      .query(async () => {
        const { getPoliciesByStatus } = await import('./db');
        return await getPoliciesByStatus('pending');
      }),

    approvePolicyAdmin: publicProcedure
      .input(z.object({
        policyId: z.number(),
        points: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        const { updatePolicyStatus, getPolicyById, getAffiliateById } = await import('./db');
        const policy = await getPolicyById(input.policyId);
        if (!policy) throw new Error('Apólice não encontrada');
        
        await updatePolicyStatus(input.policyId, 'approved', input.points);
        
        // Send approval email to affiliate
        const affiliate = await getAffiliateById(policy.affiliateId);
        if (affiliate) {
          const { sendPolicyApprovalEmail } = await import('./notifications');
          await sendPolicyApprovalEmail(affiliate.email, policy.clientName, policy.policyNumber, input.points);
        }
        
        return { success: true, message: 'Apólice aprovada!' };
      }),

    rejectPolicyAdmin: publicProcedure
      .input(z.object({
        policyId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { updatePolicyStatus, getPolicyById, getAffiliateById } = await import('./db');
        const policy = await getPolicyById(input.policyId);
        if (!policy) throw new Error('Apólice não encontrada');
        
        await updatePolicyStatus(input.policyId, 'rejected', 0);
        
        // Send rejection email to affiliate
        const affiliate = await getAffiliateById(policy.affiliateId);
        if (affiliate) {
          const { sendPolicyRejectionEmail } = await import('./notifications');
          await sendPolicyRejectionEmail(affiliate.email, policy.clientName, policy.policyNumber);
        }
        
        return { success: true, message: 'Apólice rejeitada!' };
      }),

    listAffiliates: publicProcedure
      .query(async () => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        return await db.select().from(affiliates);
      }),

    updateAffiliateStatus: publicProcedure
      .input(z.object({
        affiliateId: z.number(),
        isActive: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        await db.update(affiliates).set({ isActive: input.isActive }).where(eq(affiliates.id, input.affiliateId));
        return { success: true };
      }),

    deleteAffiliate: publicProcedure
      .input(z.object({
        affiliateId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        await db.delete(affiliates).where(eq(affiliates.id, input.affiliateId));
        return { success: true };
      }),

    approveAffiliate: publicProcedure
      .input(z.object({
        affiliateId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { updateAffiliateStatus, getAffiliateById } = await import('./db');
        const affiliate = await getAffiliateById(input.affiliateId);
        if (!affiliate) throw new Error('Afiliado não encontrado');
        
        await updateAffiliateStatus(input.affiliateId, 'approved');
        
        // Send approval email
        const { sendAffiliateApprovalEmail } = await import('./notifications');
        await sendAffiliateApprovalEmail(affiliate.email, affiliate.name, affiliate.affiliateCode);
        
        return { success: true };
      }),

    rejectAffiliate: publicProcedure
      .input(z.object({
        affiliateId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const { updateAffiliateStatus, getAffiliateById } = await import('./db');
        const affiliate = await getAffiliateById(input.affiliateId);
        if (!affiliate) throw new Error('Afiliado não encontrado');
        
        await updateAffiliateStatus(input.affiliateId, 'rejected');
        
        // Send rejection email
        const { sendAffiliateRejectionEmail } = await import('./notifications');
        await sendAffiliateRejectionEmail(affiliate.email, affiliate.name);
        
        return { success: true };
      }),

    addPolicy: publicProcedure
      .input(z.object({
        policyNumber: z.string().min(1),
        clientName: z.string().min(1),
        policyType: z.string().min(1),
        points: z.number().min(0),
        affiliateId: z.number().min(1),
      }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const { policies } = await import('../drizzle/schema');
        const existing = await db.select().from(policies).where(eq(policies.policyNumber, input.policyNumber)).limit(1);
        if (existing.length > 0) {
          throw new Error('Número de apólice já existe');
        }

        await db.insert(policies).values({
          affiliateId: input.affiliateId,
          policyNumber: input.policyNumber,
          clientName: input.clientName,
          policyType: input.policyType,
          status: 'pending',
          points: input.points,
          submittedAt: new Date(),
        });

        return { success: true, message: 'Apólice adicionada com sucesso!' };
      }),

    getPendingAffiliates: publicProcedure
      .query(async () => {
        const { getPendingAffiliates } = await import('./db');
        return await getPendingAffiliates();
      }),


  }),

  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
