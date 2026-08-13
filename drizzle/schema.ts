import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isBlocked: int("isBlocked").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const adminAccounts = mysqlTable("adminAccounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  whatsapp: varchar("whatsapp", { length: 30 }),
  address: text("address"),
  accountType: mysqlEnum("accountType", ["admin", "agent", "both"])
    .default("admin")
    .notNull(),
  adminRole: mysqlEnum("adminRole", ["master", "standard"])
    .default("standard")
    .notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "blocked"])
    .default("approved")
    .notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminAccount = typeof adminAccounts.$inferSelect;
export type InsertAdminAccount = typeof adminAccounts.$inferInsert;

export const crmClients = mysqlTable("crmClients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  whatsapp: varchar("whatsapp", { length: 30 }),
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "meeting",
    "proposal",
    "client",
    "closed",
  ])
    .default("new")
    .notNull(),
  source: varchar("source", { length: 100 }),
  assignedAdminEmail: varchar("assignedAdminEmail", { length: 320 }),
  nextFollowUpAt: timestamp("nextFollowUpAt"),
  birthDate: timestamp("birthDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const crmActivities = mysqlTable("crmActivities", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  type: mysqlEnum("type", [
    "note",
    "call",
    "email",
    "sms",
    "whatsapp",
    "status",
  ])
    .default("note")
    .notNull(),
  content: text("content").notNull(),
  createdBy: varchar("createdBy", { length: 320 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const clientEmails = mysqlTable("clientEmails", {
  id: int("id").autoincrement().primaryKey(),
  agentEmail: varchar("agentEmail", { length: 320 }).notNull(),
  clientId: int("clientId").notNull(),
  direction: mysqlEnum("direction", ["sent", "received"]).notNull(),
  externalId: varchar("externalId", { length: 500 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  toEmail: varchar("toEmail", { length: 320 }).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const agentPolicies = mysqlTable("agentPolicies", {
  id: int("id").autoincrement().primaryKey(),
  agentEmail: varchar("agentEmail", { length: 320 }).notNull(),
  clientId: int("clientId"),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientPhone: varchar("clientPhone", { length: 30 }),
  birthDate: timestamp("birthDate"),
  policyNumber: varchar("policyNumber", { length: 100 }).notNull(),
  product: varchar("product", { length: 120 }),
  premiumAmount: decimal("premiumAmount", { precision: 12, scale: 2 }).default(
    "0.00"
  ),
  premiumFrequency: varchar("premiumFrequency", { length: 50 }),
  targetPremium: decimal("targetPremium", { precision: 12, scale: 2 }).default(
    "0.00"
  ),
  points: int("points").default(0),
  coverageAmount: decimal("coverageAmount", {
    precision: 14,
    scale: 2,
  }).default("0.00"),
  beneficiaries: text("beneficiaries"),
  issuedAt: timestamp("issuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const agentTasks = mysqlTable("agentTasks", {
  id: int("id").autoincrement().primaryKey(),
  agentEmail: varchar("agentEmail", { length: 320 }).notNull(),
  clientId: int("clientId"),
  title: varchar("title", { length: 255 }).notNull(),
  dueAt: timestamp("dueAt"),
  status: mysqlEnum("status", ["pending", "completed"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const scheduledMessages = mysqlTable("scheduledMessages", {
  id: int("id").autoincrement().primaryKey(),
  agentEmail: varchar("agentEmail", { length: 320 }).notNull(),
  clientId: int("clientId"),
  occasion: mysqlEnum("occasion", [
    "birthday",
    "christmas",
    "new_year",
    "policy_anniversary",
    "custom",
  ])
    .default("custom")
    .notNull(),
  channel: mysqlEnum("channel", ["email", "sms", "whatsapp"]).notNull(),
  message: text("message").notNull(),
  title: varchar("title", { length: 255 }),
  audience: mysqlEnum("audience", ["individual", "group", "all"])
    .default("individual")
    .notNull(),
  recipientGroup: varchar("recipientGroup", { length: 50 }),
  selectedClientIds: text("selectedClientIds"),
  subject: varchar("subject", { length: 255 }),
  scheduledAt: timestamp("scheduledAt"),
  lastSentAt: timestamp("lastSentAt"),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const agentEmailSettings = mysqlTable("agentEmailSettings", {
  id: int("id").autoincrement().primaryKey(),
  agentEmail: varchar("agentEmail", { length: 320 }).notNull().unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").default(587).notNull(),
  secure: int("secure").default(0).notNull(),
  user: varchar("user", { length: 320 }).notNull(),
  password: text("password").notNull(),
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 })
    .default("Affinity Financial")
    .notNull(),
  imapHost: varchar("imapHost", { length: 255 })
    .default("imap.mail.me.com")
    .notNull(),
  imapPort: int("imapPort").default(993).notNull(),
  imapUser: varchar("imapUser", { length: 320 }),
  lastImapSyncAt: timestamp("lastImapSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Affiliates table for managing affiliate program
 */
export const affiliates = mysqlTable("affiliates", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: text("name").notNull(),
  company: text("company"),
  phone: varchar("phone", { length: 20 }),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 })
    .default("10.00")
    .notNull(),
  affiliateCode: varchar("affiliateCode", { length: 50 }).notNull().unique(),
  agentNumber: varchar("agentNumber", { length: 50 }),
  isActive: int("isActive").default(1).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = typeof affiliates.$inferInsert;

/**
 * Affiliate referrals table to track referrals and conversions
 */
export const affiliateReferrals = mysqlTable("affiliateReferrals", {
  id: int("id").autoincrement().primaryKey(),
  affiliateId: int("affiliateId").notNull(),
  referralCode: varchar("referralCode", { length: 50 }).notNull().unique(),
  visitorEmail: varchar("visitorEmail", { length: 320 }),
  visitorName: text("visitorName"),
  visitorPhone: varchar("visitorPhone", { length: 20 }),
  status: mysqlEnum("status", ["pending", "converted", "closed"])
    .default("pending")
    .notNull(),
  commissionAmount: decimal("commissionAmount", {
    precision: 10,
    scale: 2,
  }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type InsertAffiliateReferral = typeof affiliateReferrals.$inferInsert;

/**
 * Policies table to track insurance policies submitted by affiliates
 */
export const policies = mysqlTable("policies", {
  id: int("id").autoincrement().primaryKey(),
  affiliateId: int("affiliateId").notNull(),
  policyNumber: varchar("policyNumber", { length: 100 }).notNull().unique(),
  clientName: text("clientName").notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientPhone: varchar("clientPhone", { length: 20 }),
  policyType: varchar("policyType", { length: 100 }).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "approved",
    "rejected",
    "active",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  points: int("points").default(0).notNull(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = typeof policies.$inferInsert;

/**
 * Password reset tokens table for managing password recovery
 */
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  userType: mysqlEnum("userType", ["admin", "affiliate"]).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: int("used").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * SMTP Configuration table for email settings
 */
export const smtpConfig = mysqlTable("smtpConfig", {
  id: int("id").autoincrement().primaryKey(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").notNull(),
  secure: int("secure").default(0).notNull(),
  user: varchar("user", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SmtpConfig = typeof smtpConfig.$inferSelect;
export type InsertSmtpConfig = typeof smtpConfig.$inferInsert;

/**
 * Testimonials table for managing customer testimonials
 */
export const testimonials = mysqlTable("testimonials", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  quote: text("quote").notNull(),
  email: varchar("email", { length: 320 }),
  rating: int("rating").default(5).notNull(),
  source: mysqlEnum("source", ["manual", "client"]).default("manual").notNull(),
  amountReceived: decimal("amountReceived", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  mediaUrl: varchar("mediaUrl", { length: 500 }),
  mediaType: mysqlEnum("mediaType", ["image", "video"]).default("image"),
  thumbnailUrl: text("thumbnailUrl"),
  isActive: int("isActive").default(1).notNull(),
  language: mysqlEnum("language", ["pt", "en", "es"]).default("pt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;
