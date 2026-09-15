// WhatsApp Web's July 2026 builds serialize keys as $1 instead of
// _serialized. Keep the bridge compatible with both wire formats.
export function serializedKey(key) {
  if (typeof key === 'string') return key;
  if (!key || typeof key !== 'object') return '';
  if (key._serialized || key.$1) return key._serialized || key.$1;
  // Some builds omit the serialized property but retain the key components.
  if (typeof key.user === 'string' && typeof key.server === 'string') return key.user+'@'+key.server;
  const remote = typeof key.remote === 'string' ? key.remote : serializedKey(key.remote);
  if (typeof key.fromMe === 'boolean' && remote && typeof key.id === 'string') {
    return String(key.fromMe)+'_'+remote+'_'+key.id+(key.participant?'_'+serializedKey(key.participant):'');
  }
  return Object.values(key).find(value=>typeof value==='string' && /^(?:true|false)_\d+@(?:c\.us|lid)_[A-Za-z0-9]+$/.test(value)) || '';
}

export function normalizeMessage(message) {
  if (!message) return message;
  const raw = message.rawData || message._data || {};
  const key = message.id || raw.id;
  const id = serializedKey(key);
  if (id) message.id = {...(typeof key === 'object' ? key : {}), _serialized:id};
  message.from = serializedKey(message.from) || serializedKey(raw.from);
  message.to = serializedKey(message.to) || serializedKey(raw.to);
  if (typeof message.fromMe !== 'boolean') {
    message.fromMe = typeof key?.fromMe === 'boolean' ? key.fromMe : id.startsWith('true_');
  }
  const remote = serializedKey(key?.remote);
  if (message.fromMe && !message.to) message.to = remote;
  if (!message.fromMe && !message.from) message.from = remote;
  return message;
}
