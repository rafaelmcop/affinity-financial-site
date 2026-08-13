import { connect } from "cloudflare:sockets";
import { Buffer } from "node:buffer";
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

const cleanReplyBody = (value: string) =>
  value
    .split(/\r?\n(?=(?:Sent from my (?:iPhone|iPad)|On .+ wrote:|Em .+ escreveu:|>))/i)[0]
    .replace(/\r?\n>[\s\S]*$/gi, "")
    .trim();

const quoteImap = (value: string) =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

class ImapConnection {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private pending = new Uint8Array();

  constructor(private socket: ReturnType<typeof connect>) {
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  async open() {
    await this.socket.opened;
    await this.readUntil(value => /(?:^|\r\n)\* (?:OK|PREAUTH)/i.test(value));
  }

  async command(tag: string, command: string) {
    await this.writer.write(this.encoder.encode(`${tag} ${command}\r\n`));
    const bytes = await this.readUntil(value =>
      new RegExp(`(?:^|\\r\\n)${tag} (?:OK|NO|BAD)`, "i").test(value)
    );
    const text = this.decoder.decode(bytes);
    const status = text.match(
      new RegExp(`(?:^|\\r\\n)${tag} (OK|NO|BAD)[^\\r\\n]*`, "i")
    );
    if (!status || status[1].toUpperCase() !== "OK")
      throw new Error(status?.[0]?.trim() || `IMAP ${command} falhou`);
    return { bytes, text };
  }

  async close() {
    await this.command("ZZ", "LOGOUT").catch(() => undefined);
    this.reader.releaseLock();
    this.writer.releaseLock();
    await this.socket.close().catch(() => undefined);
  }

  private async readUntil(done: (text: string) => boolean) {
    let data = this.pending;
    this.pending = new Uint8Array();
    while (!done(this.decoder.decode(data))) {
      const next = await this.reader.read();
      if (next.done) throw new Error("A conexão IMAP foi encerrada antes da resposta");
      const joined = new Uint8Array(data.length + next.value.length);
      joined.set(data);
      joined.set(next.value, data.length);
      data = joined;
    }
    return data;
  }
}

const imapDate = (date: Date) => {
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getUTCDate()}-${month[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
};

const extractLiteral = (bytes: Uint8Array) => {
  const preview = new TextDecoder().decode(bytes);
  const match = /\{(\d+)\}\r\n/.exec(preview);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  return bytes.slice(start, start + Number(match[1]));
};

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
  const socket = connect(
    {
      hostname: String(config.imapHost || "imap.mail.me.com"),
      port: Number(config.imapPort || 993),
    },
    { secureTransport: "on" }
  );
  const client = new ImapConnection(socket);
  let imported = 0;
  try {
    await client.open();
    await client.command(
      "A1",
      `LOGIN ${quoteImap(String(config.imapUser || config.user))} ${quoteImap(password)}`
    );
    await client.command("A2", "SELECT INBOX");
    const since = config.lastImapSyncAt
      ? new Date(String(config.lastImapSyncAt))
      : new Date(Date.now() - 30 * 86400000);
    const customers = await env.DB.prepare(
      "SELECT id,email FROM crmClients WHERE lower(assignedAdminEmail)=? AND email IS NOT NULL AND trim(email)<>''"
    )
      .bind(owner)
      .all<Row>();
    const customerByEmail = new Map(
      customers.results.map(row => [cleanAddress(String(row.email)), row])
    );
    const uidSet = new Set<string>();
    let sequence = 3;
    for (const email of customerByEmail.keys()) {
      const search = await client.command(
        `A${sequence++}`,
        `UID SEARCH SINCE ${imapDate(since)} FROM ${quoteImap(email)}`
      );
      const line = search.text.match(/(?:^|\r\n)\* SEARCH([^\r\n]*)/i)?.[1] || "";
      for (const uid of line.trim().split(/\s+/).filter(Boolean)) uidSet.add(uid);
    }
    const uids = [...uidSet].slice(-100);
    for (const uid of uids) {
      const fetched = await client.command(
        `A${sequence++}`,
        `UID FETCH ${uid} (BODY.PEEK[])`
      );
      const source = extractLiteral(fetched.bytes);
      if (!source) continue;
      const parsed = await simpleParser(Buffer.from(source));
        const from = cleanAddress(parsed.from?.text || "");
        if (!from) continue;
        const customer = customerByEmail.get(from);
        if (!customer) continue;
        const externalId =
          parsed.messageId || `icloud:${owner}:${uid}`;
        const body = cleanReplyBody(String(parsed.text || "")).slice(0, 50000);
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
            (parsed.date || new Date()).toISOString()
          )
          .run();
        imported++;
    }
    await env.DB.prepare(
      "UPDATE agentEmailSettings SET lastImapSyncAt=CURRENT_TIMESTAMP WHERE lower(agentEmail)=?"
    )
      .bind(owner)
      .run();
    return { success: true, imported };
  } finally {
    await client.close();
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
