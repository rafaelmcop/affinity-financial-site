import { eq, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, affiliates, affiliateReferrals, InsertAffiliate, InsertAffiliateReferral, passwordResetTokens, smtpConfig, testimonials, InsertTestimonial } from "../drizzle/schema";
import { ENV } from './_core/env';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';

let _db: ReturnType<typeof drizzle> | null = null;

// Local preview fallback. Production always uses DATABASE_URL.
let previewTestimonialId = 3;
let previewTestimonials: any[] = [
  {
    id: 1,
    name: 'Mariana S.',
    role: 'Stoughton, MA',
    quote: 'A equipe explicou cada detalhe com muita clareza e encontrou uma proteção que realmente cabe no orçamento da nossa família.',
    email: null,
    rating: 5,
    mediaUrl: null,
    mediaType: 'image',
    thumbnailUrl: null,
    isActive: 1,
    language: 'pt',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'Carlos R.',
    role: 'Brockton, MA',
    quote: 'Atendimento humano, transparente e em português. Hoje me sinto muito mais tranquilo sabendo que minha família está protegida.',
    email: null,
    rating: 5,
    mediaUrl: null,
    mediaType: 'image',
    thumbnailUrl: null,
    isActive: 1,
    language: 'pt',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function usePreviewData() {
  return process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Affiliate queries
export async function getAffiliateByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(affiliates).where(eq(affiliates.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAffiliateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(affiliates).where(eq(affiliates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createAffiliate(data: InsertAffiliate) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(affiliates).values(data);
  return result;
}

export async function getAffiliateReferrals(affiliateId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(affiliateReferrals).where(eq(affiliateReferrals.affiliateId, affiliateId));
}

export async function createAffiliateReferral(data: InsertAffiliateReferral) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.insert(affiliateReferrals).values(data);
}

export async function updateAffiliateReferralStatus(id: number, status: 'pending' | 'converted' | 'closed') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.update(affiliateReferrals).set({ status }).where(eq(affiliateReferrals.id, id));
}

// Policy queries
export async function getPoliciesByAffiliateId(affiliateId: number) {
  const db = await getDb();
  if (!db) return [];

  const { policies } = await import('../drizzle/schema');
  return await db.select().from(policies).where(eq(policies.affiliateId, affiliateId));
}

export async function createPolicy(data: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { policies } = await import('../drizzle/schema');
  return await db.insert(policies).values(data);
}

export async function updatePolicyStatus(id: number, status: 'pending' | 'approved' | 'rejected' | 'active' | 'cancelled', points: number = 0) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const { policies } = await import('../drizzle/schema');
  return await db.update(policies).set({ status, points, approvedAt: new Date() }).where(eq(policies.id, id));
}

export async function getPoliciesLast12Months(affiliateId: number) {
  const db = await getDb();
  if (!db) return [];

  const { policies } = await import('../drizzle/schema');
  const { and } = await import('drizzle-orm');
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  return await db.select().from(policies)
    .where(and(eq(policies.affiliateId, affiliateId), eq(policies.status, 'approved')));
}

export async function updateAffiliateStatus(id: number, status: 'pending' | 'approved' | 'rejected') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  return await db.update(affiliates).set({ status }).where(eq(affiliates.id, id));
}

export async function getPendingAffiliates() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(affiliates).where(eq(affiliates.status, 'pending'));
}

// TODO: add feature queries here as your schema grows.

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalAffiliates: 0, totalPolicies: 0, totalCommissions: 0, pendingAffiliates: 0 };

  const { policies } = await import('../drizzle/schema');
  const { count } = await import('drizzle-orm');

  const affiliatesResult = await db.select({ count: count() }).from(affiliates);
  const policiesResult = await db.select({ count: count() }).from(policies);
  const pendingResult = await db.select({ count: count() }).from(affiliates).where(eq(affiliates.status, 'pending'));

  return {
    totalAffiliates: affiliatesResult[0]?.count || 0,
    totalPolicies: policiesResult[0]?.count || 0,
    totalCommissions: 0,
    pendingAffiliates: pendingResult[0]?.count || 0,
  };
}

export async function getPoliciesByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];

  const { policies, affiliates } = await import('../drizzle/schema');
  const drizzle = await import('drizzle-orm');
  const { eq } = drizzle;
  return await db.select({
    id: policies.id,
    affiliateId: policies.affiliateId,
    policyNumber: policies.policyNumber,
    clientName: policies.clientName,
    clientEmail: policies.clientEmail,
    clientPhone: policies.clientPhone,
    policyType: policies.policyType,
    status: policies.status,
    points: policies.points,
    submittedAt: policies.submittedAt,
    approvedAt: policies.approvedAt,
    createdAt: policies.createdAt,
    updatedAt: policies.updatedAt,
    affiliateName: affiliates.name,
    affiliateEmail: affiliates.email,
  })
  .from(policies)
  .innerJoin(affiliates, eq(policies.affiliateId, affiliates.id))
  .where(eq(policies.status, status as any));
}

export async function getPoliciesLastNDays(days: number) {
  const db = await getDb();
  if (!db) return [];

  const { policies } = await import('../drizzle/schema');
  const { and, gte } = await import('drizzle-orm');
  const nDaysAgo = new Date();
  nDaysAgo.setDate(nDaysAgo.getDate() - days);

  return await db.select().from(policies)
    .where(and(gte(policies.submittedAt, nDaysAgo), eq(policies.status, 'approved')));
}

export async function getCommissionsByAffiliate() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(affiliateReferrals).where(eq(affiliateReferrals.status, 'converted'));
}


export async function approveAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(affiliates).set({ status: 'approved', isActive: 1 }).where(eq(affiliates.id, affiliateId));
}

export async function rejectAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(affiliates).set({ status: 'rejected', isActive: 0 }).where(eq(affiliates.id, affiliateId));
}


export async function getPolicyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const { policies } = await import('../drizzle/schema');
  const result = await db.select().from(policies).where(eq(policies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAffiliateAgentNumber(affiliateId: number, agentNumber: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(affiliates).set({ agentNumber }).where(eq(affiliates.id, affiliateId));
}


// Password Reset Token Functions
export async function createPasswordResetToken(email: string, userType: 'admin' | 'affiliate'): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiration to 1 hour from now
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  
  // Delete any existing unused tokens for this email
  await db.delete(passwordResetTokens)
    .where(eq(passwordResetTokens.email, email));
  
  // Create new token
  await db.insert(passwordResetTokens).values({
    token,
    email,
    userType,
    expiresAt,
    used: 0,
  });
  
  return token;
}

export async function validatePasswordResetToken(token: string): Promise<{ email: string; userType: 'admin' | 'affiliate' } | null> {
  const db = await getDb();
  if (!db) return null;
  
  const resetToken = await db.select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  
  if (!resetToken || resetToken.length === 0) {
    return null;
  }
  
  const tokenData = resetToken[0];
  
  // Check if token is expired
  if (new Date() > tokenData.expiresAt) {
    return null;
  }
  
  // Check if token was already used
  if (tokenData.used === 1) {
    return null;
  }
  
  return {
    email: tokenData.email,
    userType: tokenData.userType,
  };
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(passwordResetTokens)
    .set({ used: 1 })
    .where(eq(passwordResetTokens.token, token));
}

export async function cleanupExpiredPasswordResetTokens(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Delete expired tokens
  await db.delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, new Date()));
}

// SMTP Configuration Functions
export async function getSmtpConfig() {
  const db = await getDb();
  if (!db) return null;
  
  const config = await db.select()
    .from(smtpConfig)
    .limit(1);
  
  return config && config.length > 0 ? config[0] : null;
}

export async function updateSmtpConfig(data: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const existingConfig = await getSmtpConfig();
  
  if (existingConfig) {
    await db.update(smtpConfig)
      .set({
        host: data.host,
        port: data.port,
        secure: data.secure ? 1 : 0,
        user: data.user,
        password: data.password,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
      })
      .where(eq(smtpConfig.id, existingConfig.id));
  } else {
    await db.insert(smtpConfig).values({
      host: data.host,
      port: data.port,
      secure: data.secure ? 1 : 0,
      user: data.user,
      password: data.password,
      fromEmail: data.fromEmail,
      fromName: data.fromName,
    });
  }
}


export async function updateAffiliatePassword(email: string, hashedPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(affiliates)
    .set({ passwordHash: hashedPassword })
    .where(eq(affiliates.email, email));
}


// Affiliate Management Functions
export async function getAllAffiliates() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(affiliates);
}

export async function blockAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(affiliates)
    .set({ isActive: 0 })
    .where(eq(affiliates.id, affiliateId));
}

export async function reactivateAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.update(affiliates)
    .set({ isActive: 1 })
    .where(eq(affiliates.id, affiliateId));
}

export async function deleteAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Delete affiliated referrals first (foreign key constraint)
  await db.delete(affiliateReferrals)
    .where(eq(affiliateReferrals.affiliateId, affiliateId));
  
  // Then delete affiliate
  await db.delete(affiliates)
    .where(eq(affiliates.id, affiliateId));
}

export async function updateAffiliateEmail(affiliateId: number, newEmail: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Check if email already exists
  const existingAffiliate = await db.select()
    .from(affiliates)
    .where(eq(affiliates.email, newEmail))
    .limit(1);
  
  if (existingAffiliate && existingAffiliate.length > 0) {
    throw new Error('Este email já está em uso');
  }
  
  await db.update(affiliates)
    .set({ email: newEmail })
    .where(eq(affiliates.id, affiliateId));
}

export async function resetAffiliatePasswordByAdmin(affiliateId: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const hashedPassword = await bcryptjs.hash(newPassword, 10);
  
  await db.update(affiliates)
    .set({ passwordHash: hashedPassword })
    .where(eq(affiliates.id, affiliateId));
}


// Testimonials Functions
export async function getAllTestimonials() {
  const db = await getDb();
  if (!db) return usePreviewData() ? [...previewTestimonials] : [];
  
  return await db.select().from(testimonials);
}

export async function getActiveTestimonials() {
  const db = await getDb();
  if (!db) return usePreviewData() ? previewTestimonials.filter(item => item.isActive === 1) : [];
  
  return await db.select().from(testimonials).where(eq(testimonials.isActive, 1));
}

export async function createTestimonial(data: InsertTestimonial): Promise<void> {
  const db = await getDb();
  if (!db && usePreviewData()) {
    previewTestimonials.push({
      id: previewTestimonialId++,
      mediaUrl: null,
      thumbnailUrl: null,
      mediaType: 'image',
      isActive: 1,
      rating: 5,
      language: 'pt',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    });
    return;
  }
  if (!db) throw new Error('Database not available');
  
  await db.insert(testimonials).values(data);
}

export async function updateTestimonial(id: number, data: Partial<InsertTestimonial>): Promise<void> {
  const db = await getDb();
  if (!db && usePreviewData()) {
    previewTestimonials = previewTestimonials.map(item => item.id === id ? { ...item, ...data, updatedAt: new Date() } : item);
    return;
  }
  if (!db) throw new Error('Database not available');
  
  await db.update(testimonials)
    .set(data)
    .where(eq(testimonials.id, id));
}

export async function deleteTestimonial(id: number): Promise<void> {
  const db = await getDb();
  if (!db && usePreviewData()) {
    previewTestimonials = previewTestimonials.filter(item => item.id !== id);
    return;
  }
  if (!db) throw new Error('Database not available');
  
  await db.delete(testimonials)
    .where(eq(testimonials.id, id));
}

export async function toggleTestimonialActive(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db && usePreviewData()) {
    previewTestimonials = previewTestimonials.map(item => item.id === id ? { ...item, isActive: isActive ? 1 : 0, updatedAt: new Date() } : item);
    return;
  }
  if (!db) throw new Error('Database not available');
  
  await db.update(testimonials)
    .set({ isActive: isActive ? 1 : 0 })
    .where(eq(testimonials.id, id));
}
