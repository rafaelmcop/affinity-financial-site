const origin = 'https://whatsapp-bridge.affinityfc.org';

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(incoming.pathname + incoming.search, origin);
    const headers = new Headers(request.headers);
    for (const name of ['host', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-forwarded-proto', 'x-real-ip']) headers.delete(name);
    const init = {
      method: request.method,
      headers,
      redirect: 'manual',
      signal: request.signal,
    };
    if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;
    return fetch(target, init);
  },
};
