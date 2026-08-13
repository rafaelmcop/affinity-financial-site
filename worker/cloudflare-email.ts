import nodemailer from "nodemailer";

type Row = Record<string, unknown>;
type Env = {
  DB: {
    prepare(query: string): {
      first<T>(): Promise<T | null>;
      bind(...values: unknown[]): { first<T>(): Promise<T | null> };
    };
  };
  JWT_SECRET: string;
};

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1)
    binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function encryptionKey(secret: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSmtpPassword(password: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    new TextEncoder().encode(password)
  );
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptSmtpPassword(value: string, secret: string) {
  if (!value.startsWith("v1."))
    throw new Error("A senha de e-mail precisa ser informada novamente");
  const [, iv, encrypted] = value.split(".");
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    await encryptionKey(secret),
    base64ToBytes(encrypted)
  );
  return new TextDecoder().decode(clear);
}

export async function sendEmail(
  env: Env,
  options: { to: string; subject: string; html: string }
) {
  const config = await env.DB.prepare(
    "SELECT * FROM smtpConfig ORDER BY id DESC LIMIT 1"
  ).first<Row>();
  if (!config) throw new Error("Configuração de e-mail incompleta");
  const password = await decryptSmtpPassword(
    String(config.password),
    env.JWT_SECRET
  );
  const port = Number(config.port);
  const transporter = nodemailer.createTransport({
    host: String(config.host),
    port,
    secure: Number(config.secure) === 1,
    auth: { user: String(config.user), pass: password },
    requireTLS: port === 587,
  });
  await transporter.sendMail({
    from: `"${String(config.fromName || "Affinity Financial")}" <${String(config.fromEmail)}>`,
    ...options,
  });
}

export async function sendAgentEmail(
  env: Env,
  agentEmail: string,
  options: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
    inReplyTo?: string;
    references?: string[];
  }
) {
  const config = await env.DB.prepare(
    "SELECT * FROM agentEmailSettings WHERE lower(agentEmail)=?"
  )
    .bind(agentEmail.toLowerCase())
    .first<Row>();
  if (!config) throw new Error("Configuração de e-mail do agente incompleta");
  const password = await decryptSmtpPassword(
    String(config.password),
    env.JWT_SECRET
  );
  const port = Number(config.port);
  const transporter = nodemailer.createTransport({
    host: String(config.host),
    port,
    secure: Number(config.secure) === 1,
    auth: { user: String(config.user), pass: password },
    requireTLS: port === 587,
  });
  return transporter.sendMail({
    from: `"${String(config.fromName || "Affinity Financial")}" <${String(config.fromEmail)}>`,
    ...options,
  });
}

export function emailHtml(title: string, content: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222"><h2 style="color:#b28a2e">${title}</h2>${content}<hr style="border:0;border-top:1px solid #d4af37;margin:24px 0"><p style="color:#666;font-size:12px">Affinity Financial Consulting Inc.<br>247 Washington St, Stoughton, MA<br>(857) 421-8325</p></div>`;
}
