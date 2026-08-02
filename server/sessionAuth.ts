import { parse } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "affinity_admin_session";
export const AFFILIATE_SESSION_COOKIE = "affinity_affiliate_session";

const encoder = new TextEncoder();

function getSigningKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }
  return encoder.encode(secret);
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

export async function hasAdminSession(req: Request) {
  const token = readCookie(req, ADMIN_SESSION_COOKIE);
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSigningKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
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
