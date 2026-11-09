export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export function parseMailAttachments(input) {
  if (input == null) return [];
  if (!Array.isArray(input) || input.length > 10) throw Error('Selecione no máximo 10 anexos.');
  let total = 0;
  return input.map(file => {
    if (!file || typeof file.filename !== 'string' || typeof file.content !== 'string' || !file.content.length || file.content.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.content)) throw Error('Anexo inválido. Selecione o arquivo novamente.');
    const size = file.content.length * 3 / 4 - (file.content.endsWith('==') ? 2 : file.content.endsWith('=') ? 1 : 0);
    total += size;
    if (total > MAX_ATTACHMENT_BYTES) throw Error('Os anexos devem somar no máximo 10 MB.');
    const filename = file.filename.split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g, '').slice(0,180);
    if (!filename) throw Error('Nome do anexo inválido.');
    // Accept bytes only, never caller-provided paths, URLs, MIME headers or streams.
    return {filename, content:file.content, encoding:'base64', contentType:'application/octet-stream'};
  });
}
