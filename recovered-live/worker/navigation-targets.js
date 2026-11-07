const positive=value=>/^[1-9]\d*$/.test(String(value||''));
function legacyTarget(url){const path=url.pathname,q=url.searchParams;let id;if(path==='/agentes/clientes'&&positive(q.get('cliente'))){id=q.get('cliente');return '/agentes/cliente?clientId='+id+(q.get('conversa')==='1'?'&tab=history':'');}if(path==='/agentes/cliente'&&!q.has('clientId')&&positive(q.get('id')))return '/agentes/cliente?clientId='+q.get('id');if(['/agentes/compromisso','/agent-meeting-detail','/agent-meeting-detail.html'].includes(path)&&!q.has('meetingId')&&positive(q.get('id')))return '/agentes/compromisso?meetingId='+q.get('id');return null;}

export function legacyPortalDestination(url){const target=legacyTarget(url);return target&&url.searchParams.get('assistantView')==='1'?target+'&assistantView=1':target;}
