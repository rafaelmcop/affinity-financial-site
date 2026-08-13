import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { decryptSmtpPassword } from "./cloudflare-email";

type Row = Record<string, unknown>;
type Statement = {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};
type Env = {
  DB: { prepare(query: string): Statement };
  JWT_SECRET: string;
};

const cleanAddress = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^.*<([^>]+)>.*$/, "$1");

export async function syncIcloudInbox(env: Env, agentEmail: string) {
  const owner = agentEmail.toLowerCase();
  const config = await env.DB.prepare(
    "SELECT * FROM agentEmailSettings WHERE lower(agentEmail)=?"
  )
    .bind(owner)
    .first<Row>();
  if (!config) throw new Error("Configure o e-mail do agente primeiro");
  const password = await decryptSmtpPassword(
    String(config.password),
    env.JWT_SECRET
  );
  const client = new ImapFlow({
    host: String(config.imapHost || "imap.mail.me.com"),
    port: Number(config.imapPort || 993),
    secure: true,
    auth: {
      user: String(config.imapUser || config.user),
      pass: password,
    },
    logger: false,
  });
  let imported = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = config.lastImapSyncAt
        ? new Date(String(config.lastImapSyncAt))
        : new Date(Date.now() - 30 * 86400000);
      for await (const message of client.fetch(
        { since },
        { uid: true, envelope: true, source: true, internalDate: true }
      )) {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source);
        const from = cleanAddress(parsed.from?.text || "");
        if (!from) continue;
        const customer = await env.DB.prepare(
          "SELECT id,email FROM crmClients WHERE lower(assignedAdminEmail)=? AND lower(email)=? LIMIT 1"
        )
          .bind(owner, from)
          .first<Row>();
        if (!customer) continue;
        const externalId =
          parsed.messageId || `icloud:${owner}:${String(message.uid)}`;
        const body = String(parsed.text || "")
          .trim()
          .slice(0, 50000);
        if (!body) continue;
        await env.DB.prepare(
          "INSERT OR IGNORE INTO clientEmails (agentEmail,clientId,direction,externalId,subject,body,fromEmail,toEmail,sentAt) VALUES (?,?,'received',?,?,?,?,?,?)"
        )
          .bind(
            owner,
            Number(customer.id),
            externalId,
            parsed.subject || "Sem assunto",
            body,
            from,
            String(config.fromEmail),
            (message.internalDate || parsed.date || new Date()).toISOString()
          )
          .run();
        imported++;
      }
    } finally {
      lock.release();
    }
    await env.DB.prepare(
      "UPDATE agentEmailSettings SET lastImapSyncAt=CURRENT_TIMESTAMP WHERE lower(agentEmail)=?"
    )
      .bind(owner)
      .run();
    return { success: true, imported };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function syncAllIcloudInboxes(env: Env) {
  const rows = await env.DB.prepare(
    "SELECT agentEmail FROM agentEmailSettings WHERE lower(imapHost)='imap.mail.me.com'"
  ).all<Row>();
  for (const row of rows.results) {
    try {
      await syncIcloudInbox(env, String(row.agentEmail));
    } catch (error) {
      console.error("icloud_sync_failed", row.agentEmail, error);
    }
  }
}
