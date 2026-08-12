import { isValidMediaUrl } from "../shared/videoUrl";

const SESSION_COOKIE = "affinity_admin_session";

type JsonRecord = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function trpcResult(data: unknown) {
  return { result: { data: { json: data } } };
}

function trpcError(message: string, code = "BAD_REQUEST", httpStatus = 400) {
  return {
    error: {
      json: {
        message,
        code: -32600,
        data: { code, httpStatus },
      },
    },
  };
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

async function createSession(email: string, env: Env) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    email,
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  })));
  return `${payload}.${toBase64Url(await hmac(payload, env.JWT_SECRET))}`;
}

async function getAdminEmail(request: Request, env: Env) {
  const cookie = request.headers.get("cookie") ?? "";
  const encoded = cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!encoded) return null;
  const [payload, signature] = encoded.split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload, env.JWT_SECRET);
  if (!constantTimeEqual(expected, fromBase64Url(signature))) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { email?: string; expiresAt?: number };
    if (!parsed.email || !parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed.email;
  } catch {
    return null;
  }
}

function getInput(raw: unknown) {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as JsonRecord;
  const value = record.json;
  return value && typeof value === "object" ? value as JsonRecord : {};
}

async function parseInputs(request: Request) {
  if (request.method === "GET") {
    const encoded = new URL(request.url).searchParams.get("input");
    return encoded ? JSON.parse(encoded) as JsonRecord : {};
  }
  return await request.json() as JsonRecord;
}

function normalizeTestimonial(row: JsonRecord) {
  return {
    ...row,
    id: Number(row.id),
    rating: Number(row.rating),
    isActive: Number(row.isActive),
  };
}

async function runProcedure(name: string, input: JsonRecord, request: Request, env: Env) {
  if (name === "system.ping") return trpcResult("pong");

  if (name === "auth.me") {
    const email = await getAdminEmail(request, env);
    return trpcResult(email ? { id: 1, email, name: "Administrador", role: "admin" } : null);
  }

  if (name === "auth.logout") {
    return {
      body: trpcResult({ success: true }),
      cookie: `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    };
  }

  if (name === "admin.login") {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const passwordHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)));
    const expectedHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.ADMIN_PASSWORD)));
    if (email !== env.ADMIN_EMAIL.toLowerCase() || !constantTimeEqual(passwordHash, expectedHash)) {
      return trpcError("Credenciais inválidas", "UNAUTHORIZED", 401);
    }
    const session = await createSession(email, env);
    return {
      body: trpcResult({ id: 1, email, name: "Administrador da prévia", role: "admin" }),
      cookie: `${SESSION_COOKIE}=${session}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Lax`,
    };
  }

  if (name === "testimonials.getActive") {
    const result = await env.DB.prepare("SELECT * FROM testimonials WHERE isActive = 1 ORDER BY createdAt DESC").all<JsonRecord>();
    return trpcResult(result.results.map(normalizeTestimonial));
  }

  if (name === "testimonials.submitReview") {
    const nameValue = String(input.name ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const role = String(input.role ?? "").trim();
    const quote = String(input.quote ?? "").trim();
    const rating = Number(input.rating);
    const language = String(input.language ?? "pt");
    if (nameValue.length < 2 || !email.includes("@") || role.length < 2 || quote.length < 20 || rating < 1 || rating > 5 || !["pt", "en", "es"].includes(language)) {
      return trpcError("Revise os dados da avaliação.");
    }
    const recent = await env.DB.prepare("SELECT COUNT(*) AS total FROM testimonials WHERE email = ? AND createdAt >= datetime('now', '-1 day')").bind(email).first<{ total: number }>();
    if (Number(recent?.total ?? 0) >= 3) return trpcError("Limite diário de avaliações atingido.", "TOO_MANY_REQUESTS", 429);
    await env.DB.prepare("INSERT INTO testimonials (name, email, role, quote, rating, language, mediaType, isActive) VALUES (?, ?, ?, ?, ?, ?, 'image', 0)")
      .bind(nameValue, email, role, quote, rating, language).run();
    return trpcResult({ success: true, message: "Avaliação enviada para aprovação." });
  }

  const adminEmail = await getAdminEmail(request, env);
  if (!adminEmail) return trpcError("Acesso administrativo necessário", "UNAUTHORIZED", 401);

  if (name === "testimonials.getAll") {
    const result = await env.DB.prepare("SELECT * FROM testimonials ORDER BY createdAt DESC").all<JsonRecord>();
    return trpcResult(result.results.map(normalizeTestimonial));
  }

  if (name === "testimonials.create") {
    const mediaType = String(input.mediaType ?? "image") === "video" ? "video" : "image";
    const mediaUrl = String(input.mediaUrl ?? "").trim();
    const amountReceived = Number(input.amountReceived ?? 0);
    if (!Number.isFinite(amountReceived) || amountReceived < 0 || amountReceived > 9999999999.99) return trpcError("O valor recebido não é válido.");
    if (!isValidMediaUrl(mediaUrl, mediaType)) return trpcError("O endereço da mídia não é válido.");
    await env.DB.prepare("INSERT INTO testimonials (name, role, quote, email, rating, amountReceived, mediaUrl, mediaType, language, thumbnailUrl, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
      .bind(String(input.name), String(input.role), String(input.quote), input.email ?? null, Number(input.rating ?? 5), amountReceived, mediaUrl || null, mediaType, String(input.language ?? "pt"), input.thumbnailUrl ?? null).run();
    return trpcResult({ success: true, message: "Depoimento adicionado com sucesso!" });
  }

  if (name === "testimonials.update") {
    const id = Number(input.id);
    const current = await env.DB.prepare("SELECT * FROM testimonials WHERE id = ?").bind(id).first<JsonRecord>();
    if (!current) return trpcError("Avaliação não encontrada", "NOT_FOUND", 404);
    const mediaType = String(input.mediaType ?? current.mediaType) === "video" ? "video" : "image";
    const mediaUrl = String(input.mediaUrl ?? current.mediaUrl ?? "").trim();
    const previousMediaUrl = String(current.mediaUrl ?? "").trim();
    const mediaUrlChanged = input.mediaUrl !== undefined && mediaUrl !== previousMediaUrl;
    const amountReceived = Number(input.amountReceived ?? current.amountReceived ?? 0);
    if (!Number.isFinite(amountReceived) || amountReceived < 0 || amountReceived > 9999999999.99) return trpcError("O valor recebido não é válido.");
    if (mediaUrlChanged && !isValidMediaUrl(mediaUrl, mediaType)) return trpcError("O endereço da mídia não é válido.");
    await env.DB.prepare("UPDATE testimonials SET name=?, role=?, quote=?, email=?, rating=?, amountReceived=?, mediaUrl=?, mediaType=?, language=?, thumbnailUrl=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?")
      .bind(input.name ?? current.name, input.role ?? current.role, input.quote ?? current.quote, input.email ?? current.email, input.rating ?? current.rating, amountReceived, mediaUrl || null, mediaType, input.language ?? current.language, input.thumbnailUrl ?? current.thumbnailUrl, id).run();
    return trpcResult({ success: true, message: "Depoimento atualizado com sucesso!" });
  }

  if (name === "testimonials.toggleActive") {
    await env.DB.prepare("UPDATE testimonials SET isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").bind(input.isActive ? 1 : 0, Number(input.id)).run();
    return trpcResult({ success: true, message: "Status do depoimento atualizado!" });
  }

  if (name === "testimonials.delete") {
    await env.DB.prepare("DELETE FROM testimonials WHERE id = ?").bind(Number(input.id)).run();
    return trpcResult({ success: true, message: "Depoimento deletado com sucesso!" });
  }

  return trpcError("Procedimento não disponível nesta prévia", "NOT_FOUND", 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/trpc/")) return env.ASSETS.fetch(request);

    try {
      const names = decodeURIComponent(url.pathname.slice("/api/trpc/".length)).split(",");
      const inputs = await parseInputs(request);
      const responses: unknown[] = [];
      let cookie: string | undefined;
      for (let index = 0; index < names.length; index += 1) {
        const input = getInput(inputs[String(index)] ?? inputs);
        const result = await runProcedure(names[index], input, request, env);
        if (result && typeof result === "object" && "body" in result) {
          responses.push(result.body);
          cookie = result.cookie;
        } else {
          responses.push(result);
        }
      }
      return jsonResponse(url.searchParams.get("batch") === "1" ? responses : responses[0], 200, cookie ? { "set-cookie": cookie } : undefined);
    } catch (error) {
      console.error(JSON.stringify({ event: "staging_api_error", message: error instanceof Error ? error.message : String(error) }));
      return jsonResponse([trpcError("Erro interno da prévia", "INTERNAL_SERVER_ERROR", 500)], 500);
    }
  },
} satisfies ExportedHandler<Env>;
