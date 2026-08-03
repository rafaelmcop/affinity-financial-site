import { parse } from "cookie";
import { createHash } from "node:crypto";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "affinity_admin_session";
export const AFFILIATE_SESSION_COOKIE = "affinity_affiliate_session";

const encoder = new TextEncoder();

function getSigningKey() {
  const configuredSecret = process.env.JWT_SECRET;
  const fallbackSecret = process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD;
  const secret = configuredSecret && configuredSecret.length >= 32
    ? configuredSecret
    : fallbackSecret;
  if (!secret || secret.length < 12) {
    throw new Error("Session signing secret is not configured");
  }
  return createHash("sha256").update(encoder.encode(secret)).digest();
}

function readCookie(req: Request, name: string) {
  const header = req.headers.cookie;
  return header ? parse(header)[name] : undefined;
}

export async function createAdminSession(email: string) {
  return new SignJWT({ role: "admin", email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSigningKey());
}

export async function createAffiliateSession(affiliateId: number) {
  return new SignJWT({ role: "affiliate", affiliateId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSigningKey());
}

export async function getAdminSessionEmail(req: Request) {
  const token = readCookie(req, ADMIN_SESSION_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSigningKey());
    return payload.role === "admin" && typeof payload.email === "string"
      ? payload.email
      : null;
  } catch {
    return null;
  }
}

export async function hasAdminSession(req: Request) {
  return (await getAdminSessionEmail(req)) !== null;
}

export async function getAffiliateSessionId(req: Request) {
  const token = readCookie(req, AFFILIATE_SESSION_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSigningKey());
    return payload.role === "affiliate" && typeof payload.affiliateId === "number"
      ? payload.affiliateId
      : null;
  } catch {
    return null;
  }
}
