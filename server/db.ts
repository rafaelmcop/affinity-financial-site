import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, affiliates, affiliateReferrals, InsertAffiliate, InsertAffiliateReferral } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

  const { policies } = await import('../drizzle/schema');
  return await db.select().from(policies).where(eq(policies.status, status as any));
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
