import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { adminProcedure, affiliateProcedure, publicProcedure, router } from './_core/trpc';
import { adminAccounts, affiliateReferrals, affiliates, crmActivities, crmClients, agentEmailSettings, agentPolicies, agentTasks, scheduledMessages } from '../drizzle/schema';
import { COOKIE_NAME } from '../shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { enforceRateLimit } from './rateLimit';
import { isValidMediaUrl } from '../shared/videoUrl';

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

    submitLead: affiliateProcedure
      .input(z.object({ affiliateId: z.number(), name: z.string().min(1), email: z.string().email(), phone: z.string().min(1), relationship: z.string().min(1), details: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (input.affiliateId !== ctx.affiliateId) throw new Error('Acesso negado');
        const { createAffiliateReferral } = await import('./db');
        const notes = `Como conhece: ${input.relationship}${input.details ? `\nDetalhes: ${input.details}` : ''}`;
        await createAffiliateReferral({ affiliateId: input.affiliateId, referralCode: `LEAD-${Date.now().toString(36)}`, visitorName: input.name, visitorEmail: input.email, visitorPhone: input.phone, status: 'pending', commissionAmount: '0.00', notes });
        return { success: true, message: 'Lead enviado com sucesso!' };
      }),
  }),

  agent: router({
    login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(6) })).mutation(async ({ input, ctx }) => {
      const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available');
      const [account] = await db.select().from(adminAccounts).where(eq(adminAccounts.email, input.email.toLowerCase())).limit(1);
      if (!account || account.accountType !== 'agent' || !account.isActive || !(await (await import('bcryptjs')).compare(input.password, account.passwordHash))) throw new Error('Credenciais inválidas');
      const token = await (await import('./sessionAuth')).createAdminSession(account.email); ctx.res.cookie((await import('./sessionAuth')).ADMIN_SESSION_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: 8 * 60 * 60 * 1000 });
      return { id: account.id, email: account.email, name: account.name, role: 'agent' as const, accountType: 'agent' as const };
    }),
    dashboard: adminProcedure.query(async ({ ctx }) => { const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available'); const email = ctx.adminEmail.toLowerCase(); const policies = await db.select().from(agentPolicies).where(eq(agentPolicies.agentEmail,email)); const tasks = await db.select().from(agentTasks).where(eq(agentTasks.agentEmail,email)); return { policies, tasks, pendingTasks: tasks.filter(t => t.status === 'pending').length, score: policies.length * 100 + tasks.filter(t => t.status === 'completed').length * 10, newMessages: 0, followUps: tasks.filter(t => t.status === 'pending' && t.dueAt).length }; }),
    listPolicies: adminProcedure.query(async ({ ctx }) => { const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available'); return db.select().from(agentPolicies).where(eq(agentPolicies.agentEmail,ctx.adminEmail.toLowerCase())); }),
    savePcSheet: adminProcedure.input(z.object({ clientName:z.string().min(1),clientEmail:z.string().email().optional().or(z.literal('')),clientPhone:z.string().optional(),birthDate:z.string().optional(),policyNumber:z.string().min(1),product:z.string().optional(),premiumAmount:z.number().min(0),premiumFrequency:z.string().optional(),coverageAmount:z.number().min(0),beneficiaries:z.string().optional() })).mutation(async ({input,ctx})=>{ const db=await (await import('./db')).getDb(); if(!db) throw new Error('Database not available'); const owner=ctx.adminEmail.toLowerCase();let [client]=input.clientEmail?await db.select().from(crmClients).where(and(eq(crmClients.email,input.clientEmail.toLowerCase()),eq(crmClients.assignedAdminEmail,owner))).limit(1):[];if(!client){const inserted=await db.insert(crmClients).values({name:input.clientName,email:input.clientEmail||null,phone:input.clientPhone||null,whatsapp:input.clientPhone||null,status:'client',source:'PC Sheet',assignedAdminEmail:owner,birthDate:input.birthDate?new Date(input.birthDate):null,notes:`Apólice ${input.policyNumber}`}).$returningId();[client]=await db.select().from(crmClients).where(eq(crmClients.id,inserted[0].id)).limit(1);}const [policy]=await db.select().from(agentPolicies).where(and(eq(agentPolicies.agentEmail,owner),eq(agentPolicies.policyNumber,input.policyNumber))).limit(1);const values={...input,agentEmail:owner,clientId:client.id,clientEmail:input.clientEmail||null,birthDate:input.birthDate?new Date(input.birthDate):null,premiumAmount:input.premiumAmount.toFixed(2),coverageAmount:input.coverageAmount.toFixed(2)};if(policy)await db.update(agentPolicies).set(values).where(eq(agentPolicies.id,policy.id));else await db.insert(agentPolicies).values(values);const now=new Date();const followUps=[{title:`Confirmar boas-vindas e entrega da apólice de ${input.clientName}`,dueAt:new Date(now.getTime()+2*86400000)},{title:`Revisar a apólice ${input.policyNumber} com ${input.clientName}`,dueAt:new Date(now.getTime()+30*86400000)}];await db.insert(agentTasks).values(followUps.map(task=>({...task,agentEmail:owner,clientId:client.id})));const messages=[{occasion:'christmas' as const,message:`Feliz Natal, ${input.clientName}! A Affinity Financial deseja muita paz e alegria para você e sua família.`,scheduledAt:new Date(Date.UTC(now.getUTCFullYear()+(now.getUTCMonth()===11&&now.getUTCDate()>=24?1:0),11,24,15))},{occasion:'new_year' as const,message:`Feliz Ano Novo, ${input.clientName}! Desejamos um novo ciclo de saúde, proteção e realizações.`,scheduledAt:new Date(Date.UTC(now.getUTCFullYear()+(now.getUTCMonth()===11&&now.getUTCDate()>=31?1:0),11,31,15))}];if(input.birthDate){const birth=new Date(`${input.birthDate}T12:00:00Z`);let next=new Date(Date.UTC(now.getUTCFullYear(),birth.getUTCMonth(),birth.getUTCDate(),15));if(next<=now)next=new Date(Date.UTC(now.getUTCFullYear()+1,birth.getUTCMonth(),birth.getUTCDate(),15));messages.unshift({occasion:'birthday' as any,message:`Feliz aniversário, ${input.clientName}! A equipe da Affinity Financial deseja um dia muito especial para você.`,scheduledAt:next});}await db.insert(scheduledMessages).values(messages.map(message=>({...message,agentEmail:owner,clientId:client.id,channel:'email' as const})));await db.insert(crmActivities).values({clientId:client.id,type:'status',content:`PC Sheet processado. Apólice ${input.policyNumber} vinculada e acompanhamentos preparados.`,createdBy:owner});return {success:true,clientId:client.id,automationCount:messages.length,tasksCreated:2}; }),
    listTasks: adminProcedure.query(async ({ctx})=>{const db=await (await import('./db')).getDb();if(!db)throw new Error('Database not available');return db.select().from(agentTasks).where(eq(agentTasks.agentEmail,ctx.adminEmail.toLowerCase()));}),
    createTask: adminProcedure.input(z.object({title:z.string().min(1),dueAt:z.string().optional(),clientId:z.number().optional()})).mutation(async({input,ctx})=>{const db=await (await import('./db')).getDb();if(!db)throw new Error('Database not available');await db.insert(agentTasks).values({agentEmail:ctx.adminEmail.toLowerCase(),title:input.title,dueAt:input.dueAt?new Date(input.dueAt):null,clientId:input.clientId||null});return{success:true};}),
    toggleTask: adminProcedure.input(z.object({id:z.number(),completed:z.boolean()})).mutation(async({input,ctx})=>{const db=await (await import('./db')).getDb();if(!db)throw new Error('Database not available');await db.update(agentTasks).set({status:input.completed?'completed':'pending'}).where(and(eq(agentTasks.id,input.id),eq(agentTasks.agentEmail,ctx.adminEmail.toLowerCase())));return{success:true};}),
    listMessages: adminProcedure.query(async({ctx})=>{const db=await (await import('./db')).getDb();if(!db)throw new Error('Database not available');return db.select().from(scheduledMessages).where(eq(scheduledMessages.agentEmail,ctx.adminEmail.toLowerCase()));}),
    scheduleMessage: adminProcedure.input(z.object({clientId:z.number().optional(),occasion:z.enum(['birthday','christmas','new_year','custom']),channel:z.enum(['email','sms','whatsapp']),message:z.string().min(1),scheduledAt:z.string().optional()})).mutation(async({input,ctx})=>{const db=await (await import('./db')).getDb();if(!db)throw new Error('Database not available');await db.insert(scheduledMessages).values({...input,agentEmail:ctx.adminEmail.toLowerCase(),clientId:input.clientId||null,scheduledAt:input.scheduledAt?new Date(input.scheduledAt):null});return{success:true};}),
    getEmailSettings: adminProcedure.query(async({ctx})=>{const db=await (await import('./db')).getDb();if(!db)throw new Error('Database not available');const[row]=await db.select().from(agentEmailSettings).where(eq(agentEmailSettings.agentEmail,ctx.adminEmail.toLowerCase())).limit(1);return row?{host:row.host,port:row.port,secure:row.secure===1,user:row.user,fromEmail:row.fromEmail,fromName:row.fromName,passwordConfigured:row.password.startsWith('v1.')}:null;}),
    saveEmailSettings: adminProcedure.input(z.object({host:z.string().min(1),port:z.number().min(1),secure:z.boolean(),user:z.string().email(),password:z.string().optional(),fromEmail:z.string().email(),fromName:z.string().min(1)})).mutation(async({input,ctx})=>{const db=await (await import('./db')).getDb();if(!db)throw new Error('Database not available');const owner=ctx.adminEmail.toLowerCase(),[current]=await db.select().from(agentEmailSettings).where(eq(agentEmailSettings.agentEmail,owner)).limit(1);const clear=(input.password||'').replace(/\s/g,'');const password=clear?await (await import('../worker/cloudflare-email')).encryptSmtpPassword(clear,process.env.JWT_SECRET||'local-preview-secret'):current?.password;if(!password)throw new Error('Informe a senha específica de aplicativo');const values={...input,agentEmail:owner,secure:input.secure?1:0,password};if(current)await db.update(agentEmailSettings).set(values).where(eq(agentEmailSettings.id,current.id));else await db.insert(agentEmailSettings).values(values);await db.update(adminAccounts).set({contactEmail:input.fromEmail}).where(eq(adminAccounts.email,owner));return{success:true};}),
    testEmailSettings: adminProcedure.input(z.object({email:z.string().email()})).mutation(async()=>({success:true})),
    getProfile: adminProcedure.query(async({ctx})=>{const db=await (await import('./db')).getDb();if(!db)throw new Error('Database not available');const[row]=await db.select({email:adminAccounts.email,name:adminAccounts.name,phone:adminAccounts.phone,contactEmail:adminAccounts.contactEmail,whatsapp:adminAccounts.whatsapp,address:adminAccounts.address}).from(adminAccounts).where(eq(adminAccounts.email,ctx.adminEmail.toLowerCase())).limit(1);return row||null;}),
    updateProfile: adminProcedure.input(z.object({name:z.string().min(1),phone:z.string().optional(),contactEmail:z.string().email().optional().or(z.literal('')),whatsapp:z.string().optional(),address:z.string().optional()})).mutation(async({input,ctx})=>{const db=await (await import('./db')).getDb();if(!db)throw new Error('Database not available');await db.update(adminAccounts).set({...input,contactEmail:input.contactEmail||null}).where(and(eq(adminAccounts.email,ctx.adminEmail.toLowerCase()),eq(adminAccounts.accountType,'agent')));return{success:true};}),
  }),

  admin: router({
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        enforceRateLimit(ctx.req, 'admin-login', input.email, 6, 15 * 60 * 1000);
        const previewAdminEmail = process.env.PREVIEW_ADMIN_EMAIL;
        const previewAdminPassword = process.env.PREVIEW_ADMIN_PASSWORD;
        if (process.env.NODE_ENV !== 'production' && previewAdminEmail && previewAdminPassword && input.email.toLowerCase() === previewAdminEmail.toLowerCase() && input.password === previewAdminPassword) {
          const { createAdminSession, ADMIN_SESSION_COOKIE } = await import('./sessionAuth');
          const sessionToken = await createAdminSession(input.email.toLowerCase());
          ctx.res.cookie(ADMIN_SESSION_COOKIE, sessionToken, {
            ...getSessionCookieOptions(ctx.req),
            maxAge: 8 * 60 * 60 * 1000,
          });
          return { id: 0, email: input.email.toLowerCase(), name: 'Administrador da prévia', role: 'admin' as const };
        }
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
            return { id: account.id, email: account.email, name: account.name, phone: account.phone, adminRole: account.adminRole, role: 'admin' as const };
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
          adminRole: 'master' as const,
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

    listAffiliateLeads: adminProcedure.query(async () => {
      const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available');
      return db.select().from(affiliateReferrals);
    }),
    updateAffiliateLead: adminProcedure.input(z.object({ id: z.number(), status: z.enum(['pending','converted','closed']), commissionAmount: z.number().min(0), notes: z.string().optional() })).mutation(async ({ input }) => {
      const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available');
      await db.update(affiliateReferrals).set({ status: input.status, commissionAmount: input.commissionAmount.toFixed(2), notes: input.notes || null }).where(eq(affiliateReferrals.id, input.id)); return { success: true };
    }),

    listAdmins: adminProcedure.query(async ({ ctx }) => {
      const { getDb } = await import('./db');
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const currentEmail = ctx.adminEmail.toLowerCase();
      const [currentAccount] = await db.select().from(adminAccounts).where(eq(adminAccounts.email, currentEmail)).limit(1);
      const currentRole = currentAccount?.adminRole ?? (currentEmail === process.env.ADMIN_EMAIL?.toLowerCase() ? 'master' : 'standard');
      const admins = await db.select({
        id: adminAccounts.id,
        email: adminAccounts.email,
        name: adminAccounts.name,
        phone: adminAccounts.phone,
        contactEmail: adminAccounts.contactEmail,
        whatsapp: adminAccounts.whatsapp,
        accountType: adminAccounts.accountType,
        adminRole: adminAccounts.adminRole,
        isActive: adminAccounts.isActive,
        createdAt: adminAccounts.createdAt,
      }).from(adminAccounts);
      return { admins, currentEmail, currentRole };
    }),

    createAdmin: adminProcedure
      .input(z.object({ email: z.string().email(), name: z.string().min(1), phone: z.string().max(30).optional(), contactEmail: z.string().email().optional().or(z.literal('')), whatsapp: z.string().max(30).optional(), accountType: z.enum(['admin', 'agent']), adminRole: z.enum(['master', 'standard']), password: strongPassword }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const [actor] = await db.select().from(adminAccounts).where(eq(adminAccounts.email, ctx.adminEmail.toLowerCase())).limit(1);
        const actorRole = actor?.adminRole ?? (ctx.adminEmail.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() ? 'master' : 'standard');
        if (actorRole !== 'master') throw new Error('Somente um administrador mestre pode criar administradores');
        const passwordHash = await (await import('bcryptjs')).hash(input.password, 12);
        await db.insert(adminAccounts).values({
          email: input.email.toLowerCase(), name: input.name, phone: input.phone || null, contactEmail: input.contactEmail || null, whatsapp: input.whatsapp || null, accountType: input.accountType, adminRole: input.adminRole, passwordHash, isActive: 1,
        });
        return { success: true };
      }),

    updateAdmin: adminProcedure
      .input(z.object({
        id: z.number(),
        email: z.string().email(),
        name: z.string().min(1),
        phone: z.string().max(30).optional(),
        contactEmail: z.string().email().optional().or(z.literal('')),
        whatsapp: z.string().max(30).optional(),
        accountType: z.enum(['admin', 'agent']),
        adminRole: z.enum(['master', 'standard']),
        password: z.union([strongPassword, z.literal('')]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { getDb } = await import('./db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');
        const actorEmail = ctx.adminEmail.toLowerCase();
        const [actor] = await db.select().from(adminAccounts).where(eq(adminAccounts.email, actorEmail)).limit(1);
        const actorRole = actor?.adminRole ?? (actorEmail === process.env.ADMIN_EMAIL?.toLowerCase() ? 'master' : 'standard');
        const [target] = await db.select().from(adminAccounts).where(eq(adminAccounts.id, input.id)).limit(1);
        if (!target) throw new Error('Administrador não encontrado');
        const isSelf = target.email.toLowerCase() === actorEmail;
        if (actorRole !== 'master' && !isSelf) throw new Error('Administrador padrão só pode alterar a própria conta');
        if (actorRole !== 'master' && input.adminRole !== target.adminRole) throw new Error('Somente um administrador mestre pode alterar níveis de acesso');
        if (target.adminRole === 'master' && input.adminRole !== 'master') {
          const masters = await db.select({ id: adminAccounts.id }).from(adminAccounts).where(and(eq(adminAccounts.adminRole, 'master'), eq(adminAccounts.isActive, 1)));
          if (masters.length <= 1) throw new Error('Não é possível rebaixar o último administrador mestre');
        }
        const changes: Partial<typeof adminAccounts.$inferInsert> = {
          email: input.email.toLowerCase(), name: input.name, phone: input.phone || null, contactEmail: input.contactEmail || null, whatsapp: input.whatsapp || null, accountType: input.accountType, adminRole: input.adminRole,
        };
        if (input.password) changes.passwordHash = await (await import('bcryptjs')).hash(input.password, 12);
        await db.update(adminAccounts).set(changes).where(eq(adminAccounts.id, input.id));
        return { success: true, emailChanged: isSelf && target.email.toLowerCase() !== input.email.toLowerCase() };
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
        const actorEmail = ctx.adminEmail.toLowerCase();
        const [actor] = await db.select().from(adminAccounts).where(eq(adminAccounts.email, actorEmail)).limit(1);
        const actorRole = actor?.adminRole ?? (actorEmail === process.env.ADMIN_EMAIL?.toLowerCase() ? 'master' : 'standard');
        if (actorRole !== 'master') throw new Error('Somente um administrador mestre pode bloquear ou ativar administradores');
        const [target] = await db.select().from(adminAccounts).where(eq(adminAccounts.id, input.id)).limit(1);
        if (target?.email === ctx.adminEmail) throw new Error('Você não pode bloquear sua própria conta');
        if (target?.adminRole === 'master' && !input.isActive) {
          const activeMasters = await db.select({ id: adminAccounts.id }).from(adminAccounts).where(and(eq(adminAccounts.adminRole, 'master'), eq(adminAccounts.isActive, 1)));
          if (activeMasters.length <= 1) throw new Error('Não é possível bloquear o último administrador mestre');
        }
        await db.update(adminAccounts).set({ isActive: input.isActive ? 1 : 0 }).where(eq(adminAccounts.id, input.id));
        return { success: true };
      }),


  }),

  crm: router({
    assignees: adminProcedure.query(async () => { const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available'); return db.select({ id: adminAccounts.id, email: adminAccounts.email, name: adminAccounts.name, contactEmail: adminAccounts.contactEmail, whatsapp: adminAccounts.whatsapp, isActive: adminAccounts.isActive }).from(adminAccounts); }),
    list: adminProcedure.query(async () => {
      const db = await (await import('./db')).getDb();
      if (!db) throw new Error('Database not available');
      return db.select().from(crmClients);
    }),
    create: adminProcedure.input(z.object({ name: z.string().min(1), email: z.string().email().optional().or(z.literal('')), phone: z.string().optional(), whatsapp: z.string().optional(), status: z.enum(['new','contacted','meeting','proposal','client','closed']), source: z.string().optional(), assignedAdminEmail: z.string().optional(), nextFollowUpAt: z.string().optional(), notes: z.string().optional() })).mutation(async ({ input }) => {
      const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available');
      await db.insert(crmClients).values({ ...input, email: input.email || null, nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null }); return { success: true };
    }),
    update: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(1), email: z.string().email().optional().or(z.literal('')), phone: z.string().optional(), whatsapp: z.string().optional(), status: z.enum(['new','contacted','meeting','proposal','client','closed']), source: z.string().optional(), assignedAdminEmail: z.string().optional(), nextFollowUpAt: z.string().optional(), notes: z.string().optional() })).mutation(async ({ input }) => {
      const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available'); const { id, ...data } = input;
      await db.update(crmClients).set({ ...data, email: data.email || null, nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null }).where(eq(crmClients.id, id)); return { success: true };
    }),
    activities: adminProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => { const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available'); return db.select().from(crmActivities).where(eq(crmActivities.clientId, input.clientId)); }),
    addActivity: adminProcedure.input(z.object({ clientId: z.number(), type: z.enum(['note','call','email','sms','whatsapp','status']), content: z.string().min(1) })).mutation(async ({ input, ctx }) => { const db = await (await import('./db')).getDb(); if (!db) throw new Error('Database not available'); await db.insert(crmActivities).values({ ...input, createdBy: ctx.adminEmail }); return { success: true }; }),
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
    submitReview: publicProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(320),
        role: z.string().trim().min(2).max(120),
        quote: z.string().trim().min(20).max(1500),
        rating: z.number().int().min(1).max(5),
        language: z.enum(['pt', 'en', 'es']).default('pt'),
      }))
      .mutation(async ({ input, ctx }) => {
        enforceRateLimit(ctx.req, 'public-review', input.email, 3, 24 * 60 * 60 * 1000);
        const { createTestimonial } = await import('./db');
        await createTestimonial({
          name: input.name,
          email: input.email.toLowerCase(),
          role: input.role,
          quote: input.quote,
          rating: input.rating,
          source: 'client',
          language: input.language,
          mediaType: 'image',
          isActive: 0,
        });
        return { success: true, message: 'Avaliação enviada para aprovação.' };
      }),

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

    getLocalized: publicProcedure
      .input(z.object({ language: z.enum(['pt', 'en', 'es']) }))
      .query(async () => {
        // The Cloudflare Worker translates and caches this content in production.
        // The Node development server returns the originals for the client fallback.
        const { getActiveTestimonials } = await import('./db');
        return await getActiveTestimonials();
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        quote: z.string().min(1),
        email: z.string().email().optional(),
        rating: z.number().int().min(1).max(5).optional(),
        amountReceived: z.number().min(0).max(9999999999.99).default(0),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(['image', 'video']).optional(),
        language: z.enum(['pt', 'en', 'es']).default('pt'),
        thumbnailUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const mediaType = input.mediaType || 'image';
        if (!isValidMediaUrl(input.mediaUrl || '', mediaType)) {
          throw new Error('O endereço da mídia não é válido.');
        }
        const { createTestimonial } = await import('./db');
        await createTestimonial({
          name: input.name,
          role: input.role,
          quote: input.quote,
          email: input.email,
          rating: input.rating || 5,
          source: 'manual',
          amountReceived: input.amountReceived.toFixed(2),
          mediaUrl: input.mediaUrl,
          mediaType,
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
        email: z.string().email().optional(),
        rating: z.number().int().min(1).max(5).optional(),
        amountReceived: z.number().min(0).max(9999999999.99).optional(),
        mediaUrl: z.string().optional(),
        mediaType: z.enum(['image', 'video']).optional(),
        language: z.enum(['pt', 'en', 'es']).optional(),
        thumbnailUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.mediaUrl !== undefined && input.mediaType && !isValidMediaUrl(input.mediaUrl, input.mediaType)) {
          throw new Error('O endereço da mídia não é válido.');
        }
        const { updateTestimonial } = await import('./db');
        const { id, amountReceived, ...data } = input;
        const updateData = amountReceived === undefined ? data : { ...data, amountReceived: amountReceived.toFixed(2) };
        await updateTestimonial(id, updateData);
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
