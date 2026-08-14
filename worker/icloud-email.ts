import { connect } from "cloudflare:sockets";
import { Buffer } from "node:buffer";
import { simpleParser } from "mailparser";
import { decryptSmtpPassword, emailHtml, sendAgentEmail } from "./cloudflare-email";
import { classifyPaymentNotice, extractPolicyNumbers, normalizePolicyNumber } from "../shared/paymentNotice";

type Row = Record<string, unknown>;
type Statement = {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};
type Env = {
  DB: {
    prepare(query: string): Statement;
    batch(statements: Statement[]): Promise<unknown>;
  };
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

const escapeHtml = (value: unknown) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

async function handlePaymentNotice(
  env: Env,
  owner: string,
  config: Row,
  uid: string,
  parsed: Awaited<ReturnType<typeof simpleParser>>
) {
  const subject = String(parsed.subject || "Aviso sobre pagamento da apólice");
  const rawBody = cleanReplyBody(String(parsed.text || "")).slice(0, 50000);
  const kind = classifyPaymentNotice(subject, rawBody);
  if (!kind) return false;
  if (kind !== "attention") return false;
  const externalId = `payment-notice:${parsed.messageId || `${owner}:${uid}`}`;
  const alreadySent = await env.DB.prepare(
    "SELECT id FROM clientEmails WHERE lower(agentEmail)=? AND externalId=? LIMIT 1"
  ).bind(owner, externalId).first<Row>();
  if (alreadySent) return true;
  const policies = await env.DB.prepare(
    "SELECT p.id policyId,p.policyNumber,p.clientId,c.name,c.email FROM agentPolicies p LEFT JOIN crmClients c ON c.id=p.clientId WHERE lower(p.agentEmail)=?"
  ).bind(owner).all<Row>();
  const mentionedPolicies = extractPolicyNumbers(subject, rawBody);
  const loweredBody = rawBody.toLowerCase();
  const policyMatches = policies.results.filter(row => {
    const policy = normalizePolicyNumber(row.policyNumber);
    return policy && mentionedPolicies.has(policy);
  });
  const emailMatches = policies.results.filter(row => {
    const email = cleanAddress(String(row.email || ""));
    return email && loweredBody.includes(email);
  });
  const uniqueClients = new Map(policyMatches.map(row => [Number(row.clientId), row]));
  const match = uniqueClients.size === 1 ? [...uniqueClients.values()][0] : null;
  const possibleClients = new Map(emailMatches.map(row => [Number(row.clientId), row]));
  const possibleMatch = possibleClients.size === 1 ? [...possibleClients.values()][0] : null;
  const taskPrefix = `[Pagamento ${uid}]`;
  if (!match || !match.clientId || !match.email) {
    const reason = !match
      ? possibleMatch
        ? "Confirmar número da apólice"
        : "Identificar cliente e apólice"
      : "Completar o e-mail do cliente";
    const title = `${taskPrefix} ${reason} — ${subject}`.slice(0, 255);
    const existing = await env.DB.prepare(
      "SELECT id FROM agentTasks WHERE lower(agentEmail)=? AND title LIKE ? AND status='pending' LIMIT 1"
    ).bind(owner, `${taskPrefix}%`).first<Row>();
    if (!existing)
      await env.DB.prepare(
        "INSERT INTO agentTasks (agentEmail,clientId,title,dueAt,status) VALUES (?,?,?,CURRENT_TIMESTAMP,'pending')"
      ).bind(owner, match?.clientId ? Number(match.clientId) : possibleMatch?.clientId ? Number(possibleMatch.clientId) : null, title).run();
    return true;
  }
  const agent = await env.DB.prepare(
    "SELECT name,phone,whatsapp FROM adminAccounts WHERE lower(email)=? LIMIT 1"
  ).bind(owner).first<Row>();
  const clientName = escapeHtml(match.name || "cliente");
  const agentName = escapeHtml(agent?.name || config.fromName || "Seu agente Affinity");
  const agentPhone = escapeHtml(agent?.phone || agent?.whatsapp || "(857) 421-8325");
  const subjectToClient = "Atualização importante sobre sua apólice";
  const message = `Oi ${String(match.name || "")}, tudo bem?\n\nEstou entrando em contato para avisar que o pagamento da sua apólice acabou retornando.\n\nAssim que possível, por favor, me ligue para verificarmos isso juntos. Se preferir, você também pode reagendar o pagamento diretamente pelo aplicativo.\n\nÉ importante regularizarmos o pagamento para manter sua apólice em dia. Qualquer dúvida ou se precisar de ajuda, pode contar comigo.\n\nUm abraço,\n\n${String(agent?.name || config.fromName || "Seu agente Affinity")}\nAffinity Financial Consulting\n${String(agent?.phone || agent?.whatsapp || "(857) 421-8325")}\nwww.affinityfc.org`;
  const reservation = await env.DB.prepare(
    "INSERT OR IGNORE INTO clientEmails (agentEmail,clientId,direction,externalId,subject,body,fromEmail,toEmail,sentAt,visibility) VALUES (?,?,'sent',?,'Processando aviso de pagamento','Processando aviso de pagamento',?,?,CURRENT_TIMESTAMP,'central')"
  ).bind(owner, Number(match.clientId), externalId, String(config.fromEmail || owner), String(match.email)).run() as Row;
  if (Number((reservation.meta as Row | undefined)?.changes || 0) === 0) return true;
  try {
    const sent = await sendAgentEmail(env, owner, {
      to: String(match.email),
      subject: subjectToClient,
      html: emailHtml(
        subjectToClient,
        `<p>Oi ${clientName}, tudo bem?</p><p>Estou entrando em contato para avisar que o pagamento da sua apólice acabou retornando.</p><p>Assim que possível, por favor, me ligue para verificarmos isso juntos. Se preferir, você também pode reagendar o pagamento diretamente pelo aplicativo.</p><p>É importante regularizarmos o pagamento para manter sua apólice em dia. Qualquer dúvida ou se precisar de ajuda, pode contar comigo.</p><p>Um abraço,</p><p><strong>${agentName}</strong><br>Affinity Financial Consulting<br>📞 ${agentPhone}<br>🌐 <a href="https://www.affinityfc.org">www.affinityfc.org</a></p>`
      ),
    });
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE clientEmails SET subject='Aviso de pagamento processado',body='Controle interno de processamento',visibility='central',sentAt=CURRENT_TIMESTAMP WHERE lower(agentEmail)=? AND externalId=?"
      ).bind(owner, externalId),
      env.DB.prepare(
        "INSERT INTO clientEmails (agentEmail,clientId,direction,externalId,subject,body,fromEmail,toEmail,sentAt,visibility) VALUES (?,?,'sent',?,?,?,?,?,CURRENT_TIMESTAMP,'client')"
      ).bind(owner, Number(match.clientId), String(sent.messageId || `payment-sent:${owner}:${uid}`), subjectToClient, message, String(config.fromEmail || owner), String(match.email)),
      env.DB.prepare(
        "INSERT INTO crmActivities (clientId,type,content,createdBy) VALUES (?,'email',?,?)"
      ).bind(Number(match.clientId), `Aviso de pagamento encaminhado automaticamente para a apólice ${String(match.policyNumber || "")}. Referência: ${String(sent.messageId || externalId)}`, owner),
      env.DB.prepare(
        "UPDATE agentTasks SET status='completed' WHERE lower(agentEmail)=? AND title LIKE ? AND status='pending'"
      ).bind(owner, `${taskPrefix}%`),
    ]);
  } catch (error) {
    await env.DB.prepare(
      "DELETE FROM clientEmails WHERE lower(agentEmail)=? AND externalId=? AND visibility='central'"
    ).bind(owner, externalId).run();
    throw error;
  }
  return true;
}

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
    const paymentUidSet = new Set<string>();
    let sequence = 3;
    for (const email of customerByEmail.keys()) {
      const search = await client.command(
        `A${sequence++}`,
        `UID SEARCH SINCE ${imapDate(since)} FROM ${quoteImap(email)}`
      );
      const line = search.text.match(/(?:^|\r\n)\* SEARCH([^\r\n]*)/i)?.[1] || "";
      for (const uid of line.trim().split(/\s+/).filter(Boolean)) uidSet.add(uid);
    }
    const paymentSince = config.lastImapSyncAt
      ? new Date(String(config.lastImapSyncAt))
      : new Date(Date.now() - 86400000);
    for (const keyword of ["payment", "premium", "billing", "pagamento"]) {
      const search = await client.command(
        `A${sequence++}`,
        `UID SEARCH SINCE ${imapDate(paymentSince)} SUBJECT ${quoteImap(keyword)}`
      );
      const line = search.text.match(/(?:^|\r\n)\* SEARCH([^\r\n]*)/i)?.[1] || "";
      for (const uid of line.trim().split(/\s+/).filter(Boolean)) paymentUidSet.add(uid);
    }
    const pendingPaymentTasks = await env.DB.prepare(
      "SELECT title FROM agentTasks WHERE lower(agentEmail)=? AND status='pending' AND title LIKE '[Pagamento %'"
    ).bind(owner).all<Row>();
    for (const task of pendingPaymentTasks.results) {
      const uid = String(task.title || "").match(/^\[Pagamento\s+(\d+)\]/)?.[1];
      if (uid) paymentUidSet.add(uid);
    }
    const uids = [...new Set([...uidSet, ...paymentUidSet])].slice(-150);
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
        if (!customer) {
          if (paymentUidSet.has(uid) && await handlePaymentNotice(env, owner, config, uid, parsed)) imported++;
          continue;
        }
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
