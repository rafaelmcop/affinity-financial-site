export function installAttachmentDownloads() {
  document.addEventListener('click', async event => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== '/api/agent/whatsapp/media') return;
    event.preventDefault();
    const notice = document.querySelector('#sendError');
    const download = link.hasAttribute('download');
    const preview = download ? null : window.open('', '_blank');
    if (preview) preview.opener = null;
    if (notice) notice.textContent = 'Carregando arquivo…';
    try {
      const response = await fetch(url.href, {credentials: 'same-origin', signal: AbortSignal.timeout(65000)});
      const type = (response.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
      if (!response.ok || type === 'application/json' || type.endsWith('+json') || type === 'text/html') {
        const error = type.includes('json') ? await response.json().catch(() => ({})) : {};
        throw Error(error.error || (response.status === 401 ? 'Entre novamente no portal para abrir o arquivo.' : 'O serviço não retornou o arquivo. Tente novamente.'));
      }
      const blob = await response.blob();
      if (!blob.size) throw Error('O serviço retornou um arquivo vazio.');
      const objectUrl = URL.createObjectURL(blob);
      if (preview) preview.location.replace(objectUrl);
      else {
        const saved = document.createElement('a');
        saved.href = objectUrl;
        const extensions = {'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp','audio/ogg':'ogg','audio/mpeg':'mp3','audio/wav':'wav','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx','application/vnd.ms-excel':'xls'};
        saved.download = link.getAttribute('download') || link.textContent.trim() || 'arquivo';
        if (!/\.[a-z0-9]{2,5}$/i.test(saved.download) && extensions[type]) saved.download += '.' + extensions[type];
        saved.click();
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 300000);
      if (notice) notice.textContent = '';
    } catch (error) {
      preview?.close();
      if (notice) notice.textContent = error.name === 'TimeoutError' ? 'O arquivo demorou demais para responder. Tente novamente.' : error.message;
    }
  });
}

export const attachmentDownloadScript = '(' + installAttachmentDownloads.toString() + ')();';
