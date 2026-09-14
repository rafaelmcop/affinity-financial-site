// WhatsApp Web's July 2026 builds serialize keys as $1 instead of
// _serialized. Keep the bridge compatible with both wire formats.
export function serializedKey(key) {
  if (typeof key === 'string') return key;
  return key?._serialized || key?.$1 || '';
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
