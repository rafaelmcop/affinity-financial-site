const json2=(v,status=200)=>Response.json(v,{status});const encode=b=>Buffer.from(b).toString("base64url");
export async function whatsappRoute(request, env, auth) {
  const url = new URL(request.url), page = ["/agentes/whatsapp", "/agent-whatsapp.html"].includes(url.pathname);
  if (!page && !url.pathname.startsWith("/api/agent/whatsapp/")) return null;
  try {
    const email = await auth.email(request, env);
    if (!email) return page ? Response.redirect(new URL("/agentes/login", url), 302) : json2({ error: "Entre novamente no portal." }, 401);
    const { account } = await auth.access(email, env);
    if (!account || !Number(account.isActive) || account.status !== "approved" || !["agent", "both"].includes(account.accountType)) return json2({ error: "Acesso restrito ao agente." }, 403);
    if (page) return new Response(agentWhatsAppPage(), { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-store" } });
    const action = url.pathname.split("/").at(-1), method = request.method;
    if (action === "contacts" && method === "GET") {
      const rows = await env.DB.prepare("SELECT id,name,phone,whatsapp FROM crmClients WHERE lower(assignedAdminEmail)=? ORDER BY name COLLATE NOCASE").bind(email.toLowerCase()).all();
      return json2(rows.results || []);
    }
    if (action === "contact" && method === "GET") {
      const id = Number(url.searchParams.get("clientId"));
      if (!Number.isInteger(id) || id <= 0) return json2({ error: "Cliente inv\xE1lido." }, 400);
      const c = await env.DB.prepare("SELECT id,name,phone,whatsapp FROM crmClients WHERE id=? AND lower(assignedAdminEmail)=?").bind(id, email.toLowerCase()).first();
      if (!c) return json2({ error: "Cliente n\xE3o encontrado." }, 404);
      return json2({ id: c.id, name: c.name, phone: c.phone || c.whatsapp || "" });
    }
    if (!(["status", "chats", "messages", "media"].includes(action) && method === "GET") && !(["connect", "disconnect", "send"].includes(action) && method === "POST")) return json2({ error: "A\xE7\xE3o inv\xE1lida." }, 405);
    if (method === "POST" && (request.headers.get("origin") !== url.origin || !request.headers.get("content-type")?.startsWith("application/json"))) return json2({ error: "Solicita\xE7\xE3o inv\xE1lida." }, 403);
    if (!env.WHATSAPP_BRIDGE_URL || !env.WHATSAPP_BRIDGE_SECRET) return json2({ state: "setup_required", error: "A conex\xE3o de teste ainda precisa ser ativada pelo administrador." }, 503);
    const base = new URL(env.WHATSAPP_BRIDGE_URL);
    if (base.protocol !== "https:" && !(["localhost", "127.0.0.1"].includes(base.hostname) && url.hostname === "127.0.0.1")) return json2({ error: "Configura\xE7\xE3o da conex\xE3o inv\xE1lida." }, 503);
    let body;
    if (method === "POST") {
      const reader = request.body?.getReader(), parts = [];
      let size = 0;
      if (reader) while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 11500000) {
          await reader.cancel();
          return json2({ error: "Mensagem muito grande." }, 413);
        }
        parts.push(value);
      }
      body = await new Blob(parts).text();
      try {
        JSON.parse(body || "{}");
      } catch {
        return json2({ error: "Solicita\xE7\xE3o inv\xE1lida." }, 400);
      }
    }
    const encoder = new TextEncoder(), payload = encode(encoder.encode(JSON.stringify({ aud: "affinity-whatsapp", owner: email.toLowerCase(), exp: Math.floor(Date.now() / 1e3) + 60 })));
    const key2 = await crypto.subtle.importKey("raw", encoder.encode(env.WHATSAPP_BRIDGE_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = encode(new Uint8Array(await crypto.subtle.sign("HMAC", key2, encoder.encode(payload))));
    const target = new URL("/" + action, base);
    if (action === "messages") target.searchParams.set("chat", url.searchParams.get("chat") || "");
    if (action === "media") target.searchParams.set("id", url.searchParams.get("id") || "");
    const response = await fetch(target, { method, headers: { authorization: "Bearer " + payload + "." + signature, "content-type": "application/json" }, ...method === "POST" ? { body: body || "{}" } : {}, redirect: "manual", signal: AbortSignal.timeout(["send", "media"].includes(action) ? 60000 : 20000) });
    if (action === "media" && response.ok) return new Response(response.body, {status: 200, headers: {"content-type": response.headers.get("content-type") || "application/octet-stream", "content-disposition": response.headers.get("content-disposition") || "inline", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff"}});
    if (!response.headers.get("content-type")?.includes("application/json")) return json2({ error: "O servi\xE7o de WhatsApp n\xE3o respondeu corretamente." }, 502);
    return new Response(response.body, { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch (error) {
    console.error("whatsapp_bridge_error", error instanceof Error ? error.message : String(error));
    return json2({ error: "N\xE3o foi poss\xEDvel acessar o WhatsApp agora. Tente novamente." }, 503);
  }
}
