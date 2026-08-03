import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { adminProcedure, affiliateProcedure, publicProcedure, router } from './_core/trpc';
import { adminAccounts, affiliates } from '../drizzle/schema';
import { COOKIE_NAME } from '../shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { enforceRateLimit } from './rateLimit';

const strongPassword = z.string()
  .min(6, 'A senha deve ter no mínimo 6 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter uma letra maiúscula')
  .regex(/[a-z]/, 'A senha deve conter uma letra minúscula')
  .regex(/[0-9]/, 'A senha deve conter um número')
  .regex(/[^A-Za-z0-9]/, 'A senha deve conter um caractere especial');

// Notification routes (internal use)
const notificationRouter = router({
  sendAffiliateRegistrationEmail: adminProcedure
    .input(z.object({ email: z.string().email(), name: z.string() }))
    .mutation(async ({ input }) => {
      const { sendAffiliateRegistrationEmail } = await import('./notifications');
      const success = await sendAffiliateRegistrationEmail(input.email, input.name);
      return { success };
    }),

  sendAffiliateApprovalEmail: adminProcedure
    .input(z.object({ email: z.string().email(), name: z.string(), affiliateCode: z.string() }))
    .mutation(async ({ input }) => {
      const { sendAffiliateApprovalEmail } = await import('./notifications');
      const success = await sendAffiliateApprovalEmail(input.email, input.name, input.affiliateCode);
      return { success };
    }),

  sendPolicyApprovalEmail: adminProcedure
    .input(z.object({ email: z.string().email(), clientName: z.string(), policyNumber: z.string(), points: z.number() }))
    .mutation(async ({ input }) => {
      const { sendPolicyApprovalEmail } = await import('./notifications');
      const success = await sendPolicyApprovalEmail(input.email, input.clientName, input.policyNumber, input.points);
      return { success };
    }),

  sendCommissionCreditEmail: adminProcedure
    .input(z.object({ email: z.string().email(), name: z.string(), amount: z.number(), policyNumber: z.string() }))
    .mutation(async ({ input }) => {
      const { sendCommissionCreditEmail } = await import('./notifications');
      const success = await sendCommissionCreditEmail(input.email, input.name, input.amount, input.policyNumber);
      return { success };
    }),

  sendAdminNotificationEmail: adminProcedure
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
      ctx.res.clearCookie('affinity_admin_session', { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie('affinity_affiliate_session', { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  affiliate: router({
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: strongPassword,
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
      .mutation(async ({ input, ctx }) => {
        enforceRateLimit(ctx.req, 'affiliate-login', input.email, 8, 15 * 60 * 1000);
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

        if (!affiliate.passwordHash.startsWith('$2')) {
          const { hashPassword } = await import('./auth');
          const { updateAffiliatePassword } = await import('./db');
          await updateAffiliatePassword(affiliate.email, hashPassword(input.password));
        }

        const { createAffiliateSession, AFFILIATE_SESSION_COOKIE } = await import('./sessionAuth');
        const sessionToken = await createAffiliateSession(affiliate.id);
        ctx.res.cookie(AFFILIATE_SESSION_COOKIE, sessionToken, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
          id: affiliate.id,
          email: affiliate.email,
          name: affiliate.name,
          affiliateCode: affiliate.affiliateCode,
          commissionRate: affiliate.commissionRate,
        };
      }),

    getDashboard: affiliateProcedure
      .input(z.object({
        affiliateId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        if (input.affiliateId !== ctx.affiliateId) throw new Error('Acesso negado');
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

    submitPolicy: affiliateProcedure
      .input(z.object({
        affiliateId: z.number(),
        policyNumber: z.string().min(1),
        clientName: z.string().min(1),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        policyType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.affiliateId !== ctx.affiliateId) throw new Error('Acesso negado');
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
      .mutation(async ({ input, ctx }) => {
        enforceRateLimit(ctx.req, 'admin-login', input.email, 6, 15 * 60 * 1000);
        const { getDb } = await import('./db');
        const db = await getDb();
        const normalizedEmail = input.email.toLowerCase();
        if (db) {
          const [account] = await db.select().from(adminAccounts).where(eq(adminAccounts.email, normalizedEmail)).limit(1);
          if (account) {
            if (!account.isActive || !(await (await import('bcryptjs')).compare(input.password, account.passwordHash))) {
              throw new Error('Credenciais inválidas');
            }
            const { createAdminSession, ADMIN_SESSION_COOKIE } = await import('./sessionAuth');
            const sessionToken = await createAdminSession(account.email);
            ctx.res.cookie(ADMIN_SESSION_COOKIE, sessionToken, {
              ...getSessionCookieOptions(ctx.req),
              maxAge: 8 * 60 * 60 * 1000,
            });
            return { id: account.id, email: account.email, name: account.name, role: 'admin' as const };
          }
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        const temporaryAdminPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || (!adminPasswordHash && !temporaryAdminPassword)) {
          throw new Error('Login administrativo não configurado');
        }
        const hashMatches = adminPasswordHash
          ? await (await import('bcryptjs')).compare(input.password, adminPasswordHash)
          : false;
        const temporaryPasswordMatches = temporaryAdminPassword
          ? input.password === temporaryAdminPassword
          : false;
        if (normalizedEmail !== adminEmail.toLowerCase() || (!hashMatches && !temporaryPasswordMatches)) {
          throw new Error('Credenciais inválidas');
        }

        const { createAdminSession, ADMIN_SESSION_COOKIE } = await import('./sessionAuth');
        const sessionToken = await createAdminSession(adminEmail);
        ctx.res.cookie(ADMIN_SESSION_COOKIE, sessionToken, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 8 * 60 * 60 * 1000,
        });

        return {
          id: 1,
          email: adminEmail,
          name: 'Administrador',
          role: 'admin',
        };
      }),

    getStats: adminProcedure
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

    getEmailConfig: adminProcedure.query(async () => {
      const { getSmtpConfig } = await import('./db');
      const config = await getSmtpConfig();
      if (!config) return null;
      return {
        host: config.host,
        port: config.port,
        secure: config.secure === 1,
        user: config.user,
        fromEmail: config.fromEmail,
        fromName: config.fromName || 'Affinity Financial',
        passwordConfigured: Boolean(config.password),
      };
    }),

    saveEmailConfig: adminProcedure
      .input(z.object({
        host: z.string().min(1), port: z.number().int().min(1).max(65535), secure: z.boolean(),
        user: z.string().email(), password: z.string().optional(), fromEmail: z.string().email(), fromName: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { getSmtpConfig, updateSmtpConfig } = await import('./db');
        const { encryptSecret } = await import('./secretStorage');
        const current = await getSmtpConfig();
        const password = input.password ? encryptSecret(input.password.replace(/\s/g, '')) : current?.password;
        if (!password) throw new Error('Informe a senha específica de aplicativo');
        await updateSmtpConfig({ ...input, password });
        return { success: true };
      }),

    testEmailConfig: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { sendTestEmail } = await import('./notifications');
        if (!(await sendTestEmail(input.email))) throw new Error('Não foi possível enviar. Verifique o e-mail e a senha de app.');
        return { success: true };
      }),

    getPoliciesPending: adminProcedure
      .query(async () => {
        const { getPoliciesByStatus } = await import('./db');
        return await getPoliciesByStatus('pending');
      }),

    approvePolicyAdmin: adminProcedure
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

    rejectPolicyAdmin: adminProcedure
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

    listAffiliates: adminProcedure
      .query(async () => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        return await db.select().from(affiliates);
      }),

    updateAffiliateStatus: adminProcedure
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

    deleteAffiliate: adminProcedure
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

    approveAffiliate: adminProcedure
      .input(z.object({
        affiliateId: z.number(),
        agentNumber: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { updateAffiliateStatus, getAffiliateById, updateAffiliateAgentNumber } = await import('./db');
        const affiliate = await getAffiliateById(input.affiliateId);
        if (!affiliate) throw new Error('Afiliado não encontrado');
        
        await updateAffiliateStatus(input.affiliateId, 'approved');
        await updateAffiliateAgentNumber(input.affiliateId, input.agentNumber);
        
        // Send approval email
        const { sendAffiliateApprovalEmail } = await import('./notifications');
        await sendAffiliateApprovalEmail(affiliate.email, affiliate.name, input.agentNumber);
        
        return { success: true };
      }),

    rejectAffiliate: adminProcedure
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

    addPolicy: adminProcedure
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

    getPendingAffiliates: adminProcedure
      .query(async () => {
        const { getPendingAffiliates } = await import('./db');
        return await getPendingAffiliates();
      }),

    getAllAffiliates: adminProcedure
      .query(async () => {
        const { getAllAffiliates } = await import('./db');
        return await getAllAffiliates();
      }),

    blockAffiliate: adminProcedure
      .input(z.object({ affiliateId: z.number() }))
      .mutation(async ({ input }) => {
        const { blockAffiliate } = await import('./db');
        await blockAffiliate(input.affiliateId);
        return { success: true, message: 'Afiliado bloqueado com sucesso!' };
      }),

    reactivateAffiliate: adminProcedure
      .input(z.object({ affiliateId: z.number() }))
      .mutation(async ({ input }) => {
        const { reactivateAffiliate } = await import('./db');
        await reactivateAffiliate(input.affiliateId);
        return { success: true, message: 'Afiliado reativado com sucesso!' };
      }),



    updateAffiliateEmail: adminProcedure
      .input(z.object({ affiliateId: z.number(), newEmail: z.string().email() }))
      .mutation(async ({ input }) => {
        const { updateAffiliateEmail } = await import('./db');
        await updateAffiliateEmail(input.affiliateId, input.newEmail);
        return { success: true, message: 'Email atualizado com sucesso!' };
      }),

    resetAffiliatePasswordByAdmin: adminProcedure
      .input(z.object({ affiliateId: z.number(), newPassword: strongPassword }))
      .mutation(async ({ input }) => {
        const { resetAffiliatePasswordByAdmin } = await import('./db');
        await resetAffiliatePasswordByAdmin(input.affiliateId, input.newPassword);
        return { success: true, message: 'Senha redefinida com sucesso!' };
      }),

    listAdmins: adminProcedure.query(async () => {
      const { getDb } = await import('./db');
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return db.select({
        id: adminAccounts.id,
        email: adminAccounts.email,
        name: adminAccounts.name,
        isActive: adminAccounts.isActive,
        createdAt: adminAccounts.createdAt,
      }).from(adminAccounts);
    }),

    createAdmin: adminProcedure
      .input(z.object({ email: z.string().email(), name: z.string().min(1), password: strongPassword }))
      .mutation(async ({ input }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const passwordHash = await (await import('bcryptjs')).hash(input.password, 12);
        await db.insert(adminAccounts).values({
          email: input.email.toLowerCase(), name: input.name, passwordHash, isActive: 1,
        });
        return { success: true };
      }),

    changeMyPassword: adminProcedure
      .input(z.object({ currentPassword: z.string().min(6), newPassword: strongPassword }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const email = ctx.adminEmail.toLowerCase();
        const [account] = await db.select().from(adminAccounts).where(eq(adminAccounts.email, email)).limit(1);
        const bcrypt = await import('bcryptjs');
        const envPasswordMatches = email === process.env.ADMIN_EMAIL?.toLowerCase() &&
          (input.currentPassword === process.env.ADMIN_PASSWORD ||
            (!!process.env.ADMIN_PASSWORD_HASH && await bcrypt.compare(input.currentPassword, process.env.ADMIN_PASSWORD_HASH)));
        const accountPasswordMatches = account && await bcrypt.compare(input.currentPassword, account.passwordHash);
        if (!envPasswordMatches && !accountPasswordMatches) throw new Error('Senha atual inválida');
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        if (account) {
          await db.update(adminAccounts).set({ passwordHash, isActive: 1 }).where(eq(adminAccounts.id, account.id));
        } else {
          await db.insert(adminAccounts).values({ email, name: 'Administrador', passwordHash, isActive: 1 });
        }
        return { success: true };
      }),

    setAdminActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const [target] = await db.select().from(adminAccounts).where(eq(adminAccounts.id, input.id)).limit(1);
        if (target?.email === ctx.adminEmail) throw new Error('Você não pode bloquear sua própria conta');
        await db.update(adminAccounts).set({ isActive: input.isActive ? 1 : 0 }).where(eq(adminAccounts.id, input.id));
        return { success: true };
      }),


  }),

  passwordReset: router({
    requestReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
        userType: z.enum(['admin', 'affiliate']),
      }))
      .mutation(async ({ input, ctx }) => {
        enforceRateLimit(ctx.req, 'password-reset', input.email, 3, 60 * 60 * 1000);
        if (input.userType === 'admin') {
          const { getDb } = await import('./db');
          const db = await getDb();
          const normalizedEmail = input.email.toLowerCase();
          const [account] = db ? await db.select().from(adminAccounts).where(eq(adminAccounts.email, normalizedEmail)).limit(1) : [];
          const isEnvironmentAdmin = process.env.ADMIN_EMAIL?.toLowerCase() === normalizedEmail;
          if (!account && !isEnvironmentAdmin) return { success: true };
        } else {
          const { getAffiliateByEmail } = await import('./db');
          if (!(await getAffiliateByEmail(input.email))) return { success: true };
        }

        const { createPasswordResetToken } = await import('./db');
        const { sendPasswordResetEmail } = await import('./notifications');
        
        // Generate reset token
        const token = await createPasswordResetToken(input.email, input.userType);
        
        // Create reset link
        const resetLink = `${process.env.VITE_FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        
        // Send email
        await sendPasswordResetEmail(input.email, 'User', resetLink, input.userType);
        
        return { success: true };
      }),

    validateToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const { validatePasswordResetToken } = await import('./db');
        const result = await validatePasswordResetToken(input.token);
        return { valid: result !== null, userType: result?.userType };
      }),

    resetPassword: publicProcedure
      .input(z.object({ token: z.string().min(32), newPassword: strongPassword }))
      .mutation(async ({ input, ctx }) => {
        enforceRateLimit(ctx.req, 'password-reset-submit', input.token.slice(0, 16), 5, 60 * 60 * 1000);
        const { validatePasswordResetToken, markPasswordResetTokenAsUsed, updateAffiliatePassword, getDb } = await import('./db');
        const tokenData = await validatePasswordResetToken(input.token);
        if (!tokenData) throw new Error('Link inválido, expirado ou já utilizado');
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        if (tokenData.userType === 'affiliate') {
          await updateAffiliatePassword(tokenData.email, passwordHash);
        } else {
          const db = await getDb();
          if (!db) throw new Error('Database not available');
          const email = tokenData.email.toLowerCase();
          const [account] = await db.select().from(adminAccounts).where(eq(adminAccounts.email, email)).limit(1);
          if (account) await db.update(adminAccounts).set({ passwordHash, isActive: 1 }).where(eq(adminAccounts.id, account.id));
          else await db.insert(adminAccounts).values({ email, name: 'Administrador', passwordHash, isActive: 1 });
        }
        await markPasswordResetTokenAsUsed(input.token);
        return { success: true, userType: tokenData.userType };
      }),
  }),

  notification: notificationRouter,

  testimonials: router({
    getAll: adminProcedure
      .query(async () => {
        const { getAllTestimonials } = await import('./db');
        return await getAllTestimonials();
      }),

    getActive: publicProcedure
      .query(async () => {
        const { getActiveTestimonials } = await import('./db');
        return await getActiveTestimonials();
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        quote: z.string().min(1),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(['image', 'video']).optional(),
        language: z.enum(['pt', 'en', 'es']).default('pt'),
        thumbnailUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { createTestimonial } = await import('./db');
        await createTestimonial({
          name: input.name,
          role: input.role,
          quote: input.quote,
          mediaUrl: input.mediaUrl,
          mediaType: (input.mediaType || 'image') as 'image' | 'video',
          language: input.language,
          thumbnailUrl: input.thumbnailUrl,
        });
        return { success: true, message: 'Depoimento adicionado com sucesso!' };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        role: z.string().optional(),
        quote: z.string().optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(['image', 'video']).optional(),
        language: z.enum(['pt', 'en', 'es']).optional(),
        thumbnailUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateTestimonial } = await import('./db');
        const { id, ...data } = input;
        await updateTestimonial(id, data);
        return { success: true, message: 'Depoimento atualizado com sucesso!' };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteTestimonial } = await import('./db');
        await deleteTestimonial(input.id);
        return { success: true, message: 'Depoimento deletado com sucesso!' };
      }),

    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        const { toggleTestimonialActive } = await import('./db');
        await toggleTestimonialActive(input.id, input.isActive);
        return { success: true, message: 'Status do depoimento atualizado!' };
      }),
  }),
});

export type AppRouter = typeof appRouter;
