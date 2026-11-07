const publicSpaPages=new Set(['/','/avaliar','/reset-password','/agendar']);
export function sensitiveResource(path){
 let decoded;try{decoded=decodeURIComponent(path);}catch{return true;}
 return /(?:^|\/)(?:\.git|\.env(?:\.[^/]*)?|\.dev\.vars|private|node_modules)(?:\/|$)/i.test(decoded)||/\.(?:sqlite3?|db|sql|bak|pem|key|map)(?:$|\/)/i.test(decoded);
}
export function privatePage(path){
 return /^\/(?:api|admin|agentes|afiliados|assistentes)(?:\/|$)/.test(path)||/^\/(?:agent-|admin-|assistant-|affiliate-)/.test(path)||/^\/(?:preencher-aplicacao|avaliacao-convite|feedback-atendimento|reset-password|candidaturas|five-rings-connector)(?:[./]|$)/.test(path);
}
export function unexpectedSpaPage(path,html){
 if(publicSpaPages.has(path)||privatePage(path))return false;
 return html.includes('id="root"')&&html.includes('/assets/index-BIU-6RMI.js');
}
export function perimeterHeaders(response,path){
 const result=new Response(response.body,response);
 result.headers.set('X-Content-Type-Options','nosniff');
 result.headers.set('Strict-Transport-Security','max-age=31536000');
 result.headers.set('Referrer-Policy','no-referrer');
 if(privatePage(path)||result.status>=400){
  result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  result.headers.set('Cache-Control','private, no-store, max-age=0');
  result.headers.set('Pragma','no-cache');
  const vary=new Set((result.headers.get('Vary')||'').split(',').map(x=>x.trim()).filter(Boolean));
  vary.add('Cookie');vary.add('Authorization');result.headers.set('Vary',[...vary].join(', '));
 }
 return result;
}
