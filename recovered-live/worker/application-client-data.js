const columns = ['clientName', 'clientEmail', 'clientPhone', 'birthDate', 'address', 'city', 'state', 'zipCode'];

export function clientApplicationColumns(row, payload) {
 return columns.map(key => {
  const raw = Object.hasOwn(payload, key) ? payload[key] : row[key];
  const value = String(raw ?? '').trim();
  if (key === 'clientName') return value;
  return key === 'clientEmail' ? value.toLowerCase() || null : value || null;
 });
}
