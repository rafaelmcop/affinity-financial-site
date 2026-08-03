import type { Request } from "express";
import { TRPCError } from "@trpc/server";

type Entry = { count: number; resetAt: number };
const attempts = new Map<string, Entry>();

function getClientAddress(req: Request) {
  const cloudflareAddress = req.headers["cf-connecting-ip"];
  if (typeof cloudflareAddress === "string" && cloudflareAddress) return cloudflareAddress;
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function enforceRateLimit(
  req: Request,
  action: string,
  identity: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const key = `${action}:${getClientAddress(req)}:${identity.toLowerCase()}`;
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;
  if (current.count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    });
  }

  if (attempts.size > 10_000) {
    attempts.forEach((entry, entryKey) => {
      if (entry.resetAt <= now) attempts.delete(entryKey);
    });
  }
}
