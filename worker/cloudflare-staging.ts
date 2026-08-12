import { isValidMediaUrl } from "../shared/videoUrl";
import bcrypt from "bcryptjs";
import { emailHtml, encryptSmtpPassword, sendEmail } from "./cloudflare-email";

const ADMIN_COOKIE = "affinity_admin_session";
const AFFILIATE_COOKIE = "affinity_affiliate_session";

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

async function createSession(data: { type: "admin"; email: string } | { type: "affiliate"; affiliateId: number }, env: Env, maxAge: number) {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    ...data,
    expiresAt: Date.now() + maxAge * 1000,
  })));
  return `${payload}.${toBase64Url(await hmac(payload, env.JWT_SECRET))}`;
}

async function getSession(request: Request, env: Env, cookieName: string) {
  const cookie = request.headers.get("cookie") ?? "";
  const encoded = cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!encoded) return null;
  const [payload, signature] = encoded.split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload, env.JWT_SECRET);
  if (!constantTimeEqual(expected, fromBase64Url(signature))) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as JsonRecord;
    if (!Number(parsed.expiresAt) || Number(parsed.expiresAt) < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getAdminEmail(request: Request, env: Env) {
  const session = await getSession(request, env, ADMIN_COOKIE);
  return session?.type === "admin" && typeof session.email === "string" ? session.email : null;
}

async function getAffiliateId(request: Request, env: Env) {
  const session = await getSession(request, env, AFFILIATE_COOKIE);
  return session?.type === "affiliate" ? Number(session.affiliateId) : null;
}

function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function validStrongPassword(value: string) { return value.length >= 6 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value); }
function randomToken(bytes = 32) { return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes))); }
function normalizeAffiliate(row: JsonRecord) {
  const { passwordHash: _passwordHash, ...safe } = row;
  return { ...safe, id: Number(row.id), isActive: Number(row.isActive), commissionRate: String(row.commissionRate) };
}
function normalizePolicy(row: JsonRecord) { return { ...row, id: Number(row.id), affiliateId: Number(row.affiliateId), points: Number(row.points) }; }
async function sendEmailIfConfigured(env: Env, options: { to: string; subject: string; html: string }) {
  try { await sendEmail(env, options); }
  catch (error) { console.warn(JSON.stringify({ event: "optional_email_not_sent", message: error instanceof Error ? error.message : String(error) })); }
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
      cookies: [
        `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
        `${AFFILIATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      ],
    };
  }

  if (name === "admin.login") {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const account = await env.DB.prepare("SELECT * FROM adminAccounts WHERE lower(email)=?").bind(email).first<JsonRecord>();
    const accountMatches = account && Number(account.isActive) === 1 ? await bcrypt.compare(password, String(account.passwordHash)) : false;
    const passwordHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)));
    const expectedHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.ADMIN_PASSWORD)));
    const environmentMatches = email === env.ADMIN_EMAIL.toLowerCase() && constantTimeEqual(passwordHash, expectedHash);
    const authorized = account ? accountMatches : environmentMatches;
    if (!authorized) {
      return trpcError("Credenciais inválidas", "UNAUTHORIZED", 401);
    }
    const session = await createSession({ type: "admin", email }, env, 28800);
    return {
      body: trpcResult({ id: Number(account?.id || 0), email, name: account?.name || "Administrador", role: "admin" }),
      cookies: [`${ADMIN_COOKIE}=${session}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Lax`],
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

  if (name === "affiliate.register") {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const affiliateName = String(input.name ?? "").trim();
    if (!validEmail(email) || !validStrongPassword(password) || !affiliateName) return trpcError("Revise os dados. A senha precisa ter maiúscula, minúscula, número e símbolo.");
    if (await env.DB.prepare("SELECT id FROM affiliates WHERE lower(email)=?").bind(email).first()) return trpcError("Email já cadastrado");
    const code = `AFF${Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    await env.DB.prepare("INSERT INTO affiliates (email,passwordHash,name,company,phone,commissionRate,affiliateCode,isActive,status) VALUES (?,?,?,?,?,'10.00',?,1,'pending')")
      .bind(email, await bcrypt.hash(password, 12), affiliateName, input.company || null, input.phone || null, code).run();
    await sendEmailIfConfigured(env, { to: email, subject: "Registro de afiliado - Affinity Financial", html: emailHtml("Bem-vindo à Affinity Financial", `<p>Olá ${affiliateName},</p><p>Sua conta foi criada e aguarda aprovação.</p>`) });
    return trpcResult({ success: true, message: "Conta criada com sucesso! Aguarde aprovação." });
  }

  if (name === "affiliate.login") {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const row = await env.DB.prepare("SELECT * FROM affiliates WHERE lower(email)=?").bind(email).first<JsonRecord>();
    let matches = false;
    if (row) {
      const hash = String(row.passwordHash);
      if (hash.startsWith("$2")) matches = await bcrypt.compare(password, hash);
      else {
        const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)));
        matches = /^[a-f0-9]{64}$/i.test(hash) && constantTimeEqual(digest, Uint8Array.from(hash.match(/.{2}/g)!.map(value => parseInt(value, 16))));
        if (matches) await env.DB.prepare("UPDATE affiliates SET passwordHash=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(await bcrypt.hash(password, 12), row.id).run();
      }
    }
    if (!row || !matches) return trpcError("Email ou senha inválidos", "UNAUTHORIZED", 401);
    if (!Number(row.isActive)) return trpcError("Conta de afiliado bloqueada", "FORBIDDEN", 403);
    if (row.status !== "approved") return trpcError("Sua conta ainda não foi aprovada", "FORBIDDEN", 403);
    const session = await createSession({ type: "affiliate", affiliateId: Number(row.id) }, env, 604800);
    return { body: trpcResult({ id: Number(row.id), email: row.email, name: row.name, affiliateCode: row.affiliateCode, commissionRate: String(row.commissionRate) }), cookies: [`${AFFILIATE_COOKIE}=${session}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`] };
  }

  if (name === "affiliate.getDashboard" || name === "affiliate.submitPolicy") {
    const affiliateId = await getAffiliateId(request, env);
    if (!affiliateId || affiliateId !== Number(input.affiliateId)) return trpcError("Acesso negado", "UNAUTHORIZED", 401);
    if (name === "affiliate.getDashboard") {
      const affiliate = await env.DB.prepare("SELECT * FROM affiliates WHERE id=?").bind(affiliateId).first<JsonRecord>();
      if (!affiliate) return trpcError("Afiliado não encontrado", "NOT_FOUND", 404);
      const referrals = (await env.DB.prepare("SELECT * FROM affiliateReferrals WHERE affiliateId=? ORDER BY createdAt DESC").bind(affiliateId).all<JsonRecord>()).results;
      const policies = (await env.DB.prepare("SELECT * FROM policies WHERE affiliateId=? ORDER BY submittedAt DESC").bind(affiliateId).all<JsonRecord>()).results.map(normalizePolicy);
      const totalPoints = policies.filter(policy => !policy.submittedAt || new Date(String(policy.submittedAt)).getTime() >= Date.now() - 365 * 86400000).reduce((sum, policy) => sum + Number(policy.points || 0), 0);
      return trpcResult({ affiliate: normalizeAffiliate(affiliate), referrals, policies, stats: { totalReferrals: referrals.length, convertedReferrals: referrals.filter(row => row.status === "converted").length, pendingReferrals: referrals.filter(row => row.status === "pending").length, totalCommission: referrals.filter(row => row.status === "converted").reduce((sum, row) => sum + Number(row.commissionAmount || 0), 0), totalPolicies: policies.length, totalPoints } });
    }
    const policyNumber = String(input.policyNumber ?? "").trim();
    const clientName = String(input.clientName ?? "").trim();
    if (!policyNumber || !clientName || !String(input.policyType ?? "").trim()) return trpcError("Preencha os campos obrigatórios");
    if (await env.DB.prepare("SELECT id FROM policies WHERE policyNumber=?").bind(policyNumber).first()) return trpcError("Número de apólice já existe");
    await env.DB.prepare("INSERT INTO policies (affiliateId,policyNumber,clientName,clientEmail,clientPhone,policyType,status,points,submittedAt) VALUES (?,?,?,?,?,?,'pending',0,CURRENT_TIMESTAMP)")
      .bind(affiliateId, policyNumber, clientName, input.clientEmail || null, input.clientPhone || null, String(input.policyType)).run();
    return trpcResult({ success: true, message: "Apólice submetida com sucesso! Aguarde aprovação." });
  }

  if (name === "passwordReset.requestReset") {
    const email = String(input.email ?? "").trim().toLowerCase();
    const userType = input.userType === "admin" ? "admin" : "affiliate";
    if (!validEmail(email)) return trpcError("Email inválido");
    const exists = userType === "admin"
      ? await env.DB.prepare("SELECT id FROM adminAccounts WHERE lower(email)=?").bind(email).first()
      : await env.DB.prepare("SELECT id FROM affiliates WHERE lower(email)=?").bind(email).first();
    if (!exists && !(userType === "admin" && email === env.ADMIN_EMAIL.toLowerCase())) return trpcResult({ success: true });
    const token = randomToken(32);
    await env.DB.prepare("INSERT INTO passwordResetTokens (token,email,userType,expiresAt,used) VALUES (?,?,?,datetime('now','+1 hour'),0)").bind(token, email, userType).run();
    const resetLink = `${env.VITE_FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await sendEmail(env, { to: email, subject: "Recuperação de senha - Affinity Financial", html: emailHtml("Recuperação de senha", `<p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${resetLink}" style="background:#d4af37;color:#000;padding:12px 20px;text-decoration:none;border-radius:5px">Redefinir senha</a></p><p>Este link expira em uma hora.</p>`) });
    return trpcResult({ success: true });
  }

  if (name === "passwordReset.validateToken") {
    const row = await env.DB.prepare("SELECT userType FROM passwordResetTokens WHERE token=? AND used=0 AND expiresAt>CURRENT_TIMESTAMP").bind(String(input.token ?? "")).first<JsonRecord>();
    return trpcResult({ valid: Boolean(row), userType: row?.userType });
  }

  if (name === "passwordReset.resetPassword") {
    const token = String(input.token ?? "");
    const newPassword = String(input.newPassword ?? "");
    if (!validStrongPassword(newPassword)) return trpcError("A nova senha não atende aos requisitos de segurança");
    const row = await env.DB.prepare("SELECT * FROM passwordResetTokens WHERE token=? AND used=0 AND expiresAt>CURRENT_TIMESTAMP").bind(token).first<JsonRecord>();
    if (!row) return trpcError("Link inválido, expirado ou já utilizado");
    const hash = await bcrypt.hash(newPassword, 12);
    if (row.userType === "affiliate") await env.DB.prepare("UPDATE affiliates SET passwordHash=?,updatedAt=CURRENT_TIMESTAMP WHERE lower(email)=?").bind(hash, String(row.email).toLowerCase()).run();
    else await env.DB.prepare("INSERT INTO adminAccounts (email,name,passwordHash,isActive) VALUES (?,'Administrador',?,1) ON CONFLICT(email) DO UPDATE SET passwordHash=excluded.passwordHash,isActive=1,updatedAt=CURRENT_TIMESTAMP").bind(String(row.email).toLowerCase(), hash).run();
    await env.DB.prepare("UPDATE passwordResetTokens SET used=1 WHERE id=?").bind(row.id).run();
    return trpcResult({ success: true, userType: row.userType });
  }

  const adminEmail = await getAdminEmail(request, env);
  if (!adminEmail) return trpcError("Acesso administrativo necessário", "UNAUTHORIZED", 401);

  if (name === "admin.getStats") {
    const affiliates = await env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending FROM affiliates").first<JsonRecord>();
    const policies = await env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) approved FROM policies").first<JsonRecord>();
    const commissions = await env.DB.prepare("SELECT COALESCE(SUM(commissionAmount),0) total FROM affiliateReferrals WHERE status='converted'").first<JsonRecord>();
    return trpcResult({ totalAffiliates: Number(affiliates?.total || 0), pendingAffiliates: Number(affiliates?.pending || 0), totalPolicies: Number(policies?.total || 0), pendingPolicies: Number(policies?.pending || 0), approvedPolicies: Number(policies?.approved || 0), totalCommissions: Number(commissions?.total || 0) });
  }

  if (["admin.listAffiliates", "admin.getAllAffiliates", "admin.getPendingAffiliates"].includes(name)) {
    const where = name === "admin.getPendingAffiliates" ? " WHERE status='pending'" : "";
    const rows = await env.DB.prepare(`SELECT * FROM affiliates${where} ORDER BY createdAt DESC`).all<JsonRecord>();
    return trpcResult(rows.results.map(normalizeAffiliate));
  }

  if (name === "admin.getPoliciesPending") {
    const rows = await env.DB.prepare("SELECT p.*,a.name affiliateName,a.email affiliateEmail FROM policies p LEFT JOIN affiliates a ON a.id=p.affiliateId ORDER BY p.submittedAt DESC").all<JsonRecord>();
    return trpcResult(rows.results.map(normalizePolicy));
  }

  if (name === "admin.addPolicy") {
    const number = String(input.policyNumber ?? "").trim();
    if (!number || !String(input.clientName ?? "").trim() || Number(input.affiliateId) < 1) return trpcError("Preencha os campos obrigatórios");
    if (await env.DB.prepare("SELECT id FROM policies WHERE policyNumber=?").bind(number).first()) return trpcError("Número de apólice já existe");
    await env.DB.prepare("INSERT INTO policies (affiliateId,policyNumber,clientName,policyType,status,points,submittedAt) VALUES (?,?,?,?, 'pending',?,CURRENT_TIMESTAMP)").bind(Number(input.affiliateId), number, String(input.clientName), String(input.policyType || "Seguro de Vida"), Number(input.points || 0)).run();
    return trpcResult({ success: true, message: "Apólice adicionada com sucesso!" });
  }

  if (name === "admin.approvePolicyAdmin" || name === "admin.rejectPolicyAdmin") {
    const policyId = Number(input.policyId);
    const policy = await env.DB.prepare("SELECT p.*,a.email affiliateEmail FROM policies p LEFT JOIN affiliates a ON a.id=p.affiliateId WHERE p.id=?").bind(policyId).first<JsonRecord>();
    if (!policy) return trpcError("Apólice não encontrada", "NOT_FOUND", 404);
    const approved = name === "admin.approvePolicyAdmin";
    await env.DB.prepare("UPDATE policies SET status=?,points=?,approvedAt=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(approved ? "approved" : "rejected", approved ? Number(input.points || 0) : 0, approved ? new Date().toISOString() : null, policyId).run();
    if (policy.affiliateEmail) await sendEmailIfConfigured(env, { to: String(policy.affiliateEmail), subject: approved ? "Apólice aprovada - Affinity Financial" : "Apólice rejeitada - Affinity Financial", html: emailHtml(approved ? "Apólice aprovada" : "Apólice rejeitada", `<p>Apólice: <strong>${String(policy.policyNumber)}</strong></p><p>Cliente: ${String(policy.clientName)}</p>${approved ? `<p>Pontos: <strong>${Number(input.points || 0)}</strong></p>` : ""}`) });
    return trpcResult({ success: true, message: approved ? "Apólice aprovada!" : "Apólice rejeitada!" });
  }

  if (["admin.approveAffiliate", "admin.rejectAffiliate", "admin.blockAffiliate", "admin.reactivateAffiliate", "admin.updateAffiliateStatus"].includes(name)) {
    const id = Number(input.affiliateId);
    const affiliate = await env.DB.prepare("SELECT id,email,name FROM affiliates WHERE id=?").bind(id).first<JsonRecord>();
    if (!affiliate) return trpcError("Afiliado não encontrado", "NOT_FOUND", 404);
    if (name === "admin.approveAffiliate") await env.DB.prepare("UPDATE affiliates SET status='approved',agentNumber=?,isActive=1,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(String(input.agentNumber ?? "").trim(), id).run();
    else if (name === "admin.rejectAffiliate") await env.DB.prepare("UPDATE affiliates SET status='rejected',updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    else if (name === "admin.blockAffiliate") await env.DB.prepare("UPDATE affiliates SET isActive=0,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    else if (name === "admin.reactivateAffiliate") await env.DB.prepare("UPDATE affiliates SET isActive=1,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
    else await env.DB.prepare("UPDATE affiliates SET isActive=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(Number(input.isActive) ? 1 : 0, id).run();
    if (name === "admin.approveAffiliate") await sendEmailIfConfigured(env, { to: String(affiliate.email), subject: "Conta aprovada - Affinity Financial", html: emailHtml("Sua conta foi aprovada", `<p>Olá ${String(affiliate.name)},</p><p>Seu número de agente é <strong>${String(input.agentNumber)}</strong>.</p><p><a href="${env.VITE_FRONTEND_URL}/afiliados">Acessar o painel</a></p>`) });
    if (name === "admin.rejectAffiliate") await sendEmailIfConfigured(env, { to: String(affiliate.email), subject: "Atualização da solicitação - Affinity Financial", html: emailHtml("Atualização da sua solicitação", `<p>Olá ${String(affiliate.name)},</p><p>Sua solicitação não foi aprovada neste momento.</p>`) });
    return trpcResult({ success: true, message: "Afiliado atualizado com sucesso!" });
  }

  if (name === "admin.updateAffiliateEmail") {
    const email = String(input.newEmail ?? "").trim().toLowerCase();
    if (!validEmail(email)) return trpcError("Email inválido");
    try { await env.DB.prepare("UPDATE affiliates SET email=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(email, Number(input.affiliateId)).run(); }
    catch { return trpcError("Este email já está cadastrado"); }
    return trpcResult({ success: true, message: "Email atualizado com sucesso!" });
  }

  if (name === "admin.resetAffiliatePasswordByAdmin") {
    const password = String(input.newPassword ?? "");
    if (!validStrongPassword(password)) return trpcError("A senha não atende aos requisitos de segurança");
    await env.DB.prepare("UPDATE affiliates SET passwordHash=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(await bcrypt.hash(password, 12), Number(input.affiliateId)).run();
    return trpcResult({ success: true, message: "Senha redefinida com sucesso!" });
  }

  if (name === "admin.deleteAffiliate") {
    const id = Number(input.affiliateId);
    const related = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM policies WHERE affiliateId=?) + (SELECT COUNT(*) FROM affiliateReferrals WHERE affiliateId=?) total").bind(id, id).first<JsonRecord>();
    if (Number(related?.total || 0) > 0) return trpcError("Este afiliado possui apólices ou referências. Bloqueie a conta em vez de excluir.");
    await env.DB.prepare("DELETE FROM affiliates WHERE id=?").bind(id).run();
    return trpcResult({ success: true });
  }

  if (name === "admin.listAdmins") {
    const rows = await env.DB.prepare("SELECT id,email,name,isActive,createdAt FROM adminAccounts ORDER BY createdAt DESC").all<JsonRecord>();
    return trpcResult(rows.results.map(row => ({ ...row, id: Number(row.id), isActive: Number(row.isActive) })));
  }

  if (name === "admin.createAdmin") {
    const email = String(input.email ?? "").trim().toLowerCase(), password = String(input.password ?? "");
    if (!validEmail(email) || !String(input.name ?? "").trim() || !validStrongPassword(password)) return trpcError("Revise os dados do administrador");
    try { await env.DB.prepare("INSERT INTO adminAccounts (email,name,passwordHash,isActive) VALUES (?,?,?,1)").bind(email, String(input.name), await bcrypt.hash(password, 12)).run(); }
    catch { return trpcError("Este email já está cadastrado"); }
    return trpcResult({ success: true });
  }

  if (name === "admin.setAdminActive") {
    const target = await env.DB.prepare("SELECT email FROM adminAccounts WHERE id=?").bind(Number(input.id)).first<JsonRecord>();
    if (String(target?.email).toLowerCase() === adminEmail.toLowerCase()) return trpcError("Você não pode bloquear sua própria conta");
    await env.DB.prepare("UPDATE adminAccounts SET isActive=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(input.isActive ? 1 : 0, Number(input.id)).run();
    return trpcResult({ success: true });
  }

  if (name === "admin.changeMyPassword") {
    const account = await env.DB.prepare("SELECT * FROM adminAccounts WHERE lower(email)=?").bind(adminEmail.toLowerCase()).first<JsonRecord>();
    const current = String(input.currentPassword ?? ""), next = String(input.newPassword ?? "");
    const accountMatches = account ? await bcrypt.compare(current, String(account.passwordHash)) : false;
    const envMatches = adminEmail.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() && current === env.ADMIN_PASSWORD;
    if (!accountMatches && !envMatches) return trpcError("Senha atual inválida");
    if (!validStrongPassword(next)) return trpcError("A nova senha não atende aos requisitos de segurança");
    await env.DB.prepare("INSERT INTO adminAccounts (email,name,passwordHash,isActive) VALUES (?,'Administrador',?,1) ON CONFLICT(email) DO UPDATE SET passwordHash=excluded.passwordHash,isActive=1,updatedAt=CURRENT_TIMESTAMP").bind(adminEmail.toLowerCase(), await bcrypt.hash(next, 12)).run();
    return trpcResult({ success: true });
  }

  if (name === "admin.getEmailConfig") {
    const row = await env.DB.prepare("SELECT host,port,secure,user,fromEmail,fromName,password FROM smtpConfig ORDER BY id DESC LIMIT 1").first<JsonRecord>();
    return trpcResult(row ? { host: row.host, port: Number(row.port), secure: Number(row.secure) === 1, user: row.user, fromEmail: row.fromEmail, fromName: row.fromName || "Affinity Financial", passwordConfigured: String(row.password || "").startsWith("v1.") } : null);
  }

  if (name === "admin.saveEmailConfig") {
    const current = await env.DB.prepare("SELECT * FROM smtpConfig ORDER BY id DESC LIMIT 1").first<JsonRecord>();
    const clearPassword = String(input.password ?? "").replace(/\s/g, "");
    const password = clearPassword ? await encryptSmtpPassword(clearPassword, env.JWT_SECRET) : String(current?.password ?? "");
    if (!String(input.host ?? "").trim() || !validEmail(String(input.user ?? "")) || !validEmail(String(input.fromEmail ?? "")) || !password.startsWith("v1.")) return trpcError("Informe todos os dados e uma senha específica de aplicativo");
    if (current) await env.DB.prepare("UPDATE smtpConfig SET host=?,port=?,secure=?,user=?,password=?,fromEmail=?,fromName=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(String(input.host), Number(input.port), input.secure ? 1 : 0, String(input.user), password, String(input.fromEmail), String(input.fromName || "Affinity Financial"), current.id).run();
    else await env.DB.prepare("INSERT INTO smtpConfig (host,port,secure,user,password,fromEmail,fromName) VALUES (?,?,?,?,?,?,?)").bind(String(input.host), Number(input.port), input.secure ? 1 : 0, String(input.user), password, String(input.fromEmail), String(input.fromName || "Affinity Financial")).run();
    return trpcResult({ success: true });
  }

  if (name === "admin.testEmailConfig") {
    const email = String(input.email ?? "");
    if (!validEmail(email)) return trpcError("Email inválido");
    try { await sendEmail(env, { to: email, subject: "Teste de e-mail - Affinity Financial", html: emailHtml("Configuração concluída", "<p>O serviço de e-mail da Affinity Financial está funcionando corretamente.</p>") }); }
    catch (error) { console.error(JSON.stringify({ event: "smtp_test_failed", message: error instanceof Error ? error.message : String(error) })); return trpcError("Não foi possível enviar. Verifique o e-mail e a senha de app."); }
    return trpcResult({ success: true });
  }

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
    if (url.hostname === "affinityfc.org") {
      url.hostname = "www.affinityfc.org";
      return Response.redirect(url.toString(), 301);
    }
    if (!url.pathname.startsWith("/api/trpc/")) return env.ASSETS.fetch(request);

    try {
      const names = decodeURIComponent(url.pathname.slice("/api/trpc/".length)).split(",");
      const inputs = await parseInputs(request);
      const responses: unknown[] = [];
      const cookies: string[] = [];
      for (let index = 0; index < names.length; index += 1) {
        const input = getInput(inputs[String(index)] ?? inputs);
        const result = await runProcedure(names[index], input, request, env);
        if (result && typeof result === "object" && "body" in result) {
          responses.push(result.body);
          if (Array.isArray(result.cookies)) cookies.push(...result.cookies);
        } else {
          responses.push(result);
        }
      }
      const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
      for (const cookie of cookies) headers.append("set-cookie", cookie);
      return new Response(JSON.stringify(url.searchParams.get("batch") === "1" ? responses : responses[0]), { status: 200, headers });
    } catch (error) {
      console.error(JSON.stringify({ event: "staging_api_error", message: error instanceof Error ? error.message : String(error) }));
      return jsonResponse([trpcError("Erro interno da prévia", "INTERNAL_SERVER_ERROR", 500)], 500);
    }
  },
} satisfies ExportedHandler<Env>;
