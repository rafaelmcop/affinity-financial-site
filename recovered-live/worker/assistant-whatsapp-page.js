import {renderWhatsAppPage} from './affinity-agent-whatsapp-portal.js';
export function renderAssistantWhatsAppPage(theme='light'){
 return renderWhatsAppPage(theme)
  .replace(/<aside class="portal">[\s\S]*?<\/aside>/,'')
  .replace(/<script\b[^>]*src="\/(?:agent-unified-menu|user-access-menu|agent-theme)\.js[^\"]*"[^>]*><\/script>/g,'')
  .replaceAll('/api/agent/whatsapp/','/api/assistants/communications/whatsapp/')
  .replaceAll('/agentes/configuracoes?view=settings','#assistant-whatsapp-connect')
  .replace('<title>WhatsApp | Portal do Agente</title>','<title>Meu WhatsApp | Assistente</title>')
  .replace('</head>',`<style>html,body{height:100%;overflow:hidden}body{display:flex;flex-direction:column}#assistant-whatsapp-connect{flex:0 0 auto;max-height:45dvh;overflow:auto;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--surface);color:var(--text)}#assistant-whatsapp-connect summary{cursor:pointer;font-weight:750}#own-wa-connect{padding:10px 16px;background:#166534;color:white;border:1px solid #14532d;border-radius:8px;font-weight:750}#app.app{flex:1 1 0;height:auto;max-height:none;min-height:0;width:100%;grid-template-columns:300px minmax(0,1fr)}#app .chat{max-height:100%;min-height:0}@media(max-width:680px){#app.app{grid-template-columns:minmax(0,1fr)}}</style></head>`)
  .replace('<body>','<body><details id="assistant-whatsapp-connect"><summary>Meu WhatsApp · conexão</summary><p id="own-wa-status">Conferindo conexão…</p><button id="own-wa-connect" type="button">Gerar QR Code do meu WhatsApp</button><div id="own-wa-qr"></div><p id="own-wa-error" role="alert"></p></details>')
  .replace('</body>','<script src="/assistant-whatsapp.js?v=4"></script></body>');
}
