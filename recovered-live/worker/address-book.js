import {normalizeAddressBook} from '../public/address-book-parser.js';
import {leadSchema,staffIdentity,storeCentralContacts,protectInternalContacts} from './lead-flow.js';
import {staffImportIdentity} from './staff-whatsapp-reuse.js';
import {isUSPhone} from './us-area-codes.js';
export async function addressBookRoute(request,env,auth){
 const url=new URL(request.url);if(!/^\/api\/(affiliate|agent)\/address-book$/.test(url.pathname))return null;
 const kind=url.pathname.includes('/affiliate/')?'affiliate':'agent';
 const staff=await staffIdentity(request,env,auth,kind);if(!staff)return Response.json({error:'Entre com uma conta aprovada.'},{status:401});
 if(request.method!=='POST')return Response.json({error:'Use a importação da agenda.'},{status:405});
 if(request.headers.get('origin')!==url.origin||!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'Solicitação inválida.'},{status:403});
 try{const raw=await request.text();if(raw.length>250000)return Response.json({error:'Envie até 200 contatos por lote.'},{status:413});const input=JSON.parse(raw);if(!Array.isArray(input.contacts)||!input.contacts.length||input.contacts.length>200||input.contacts.some(c=>!c||typeof c!=='object'||!Array.isArray(c.emails)||c.emails.length>15||typeof c.phone!=='string'||typeof c.name!=='string'))return Response.json({error:'Lote de contatos inválido.'},{status:400});
 const {contacts,skipped}=normalizeAddressBook(input.contacts);if(!contacts.length)return Response.json({error:'Nenhum telefone válido neste lote.'},{status:400});
 await leadSchema(env);const source=await staffImportIdentity(env,staff);let existing=0;
 for(let i=0;i<contacts.length;i+=80){const chunk=contacts.slice(i,i+80);existing+=Number((await env.DB.prepare('SELECT count(*) n FROM centralLeadSources WHERE owner=? AND phone IN ('+chunk.map(()=>'?').join(',')+')').bind(source.owner,...chunk.map(c=>c.phone)).first()).n);}
 await storeCentralContacts(env,{...source,channel:'agenda'},contacts);
 for(let i=0;i<contacts.length;i+=15){const chunk=contacts.slice(i,i+15);await env.DB.prepare("INSERT INTO centralLeadSourceChannels(phone,owner,channel,emailsJson) VALUES "+chunk.map(()=>"(?,?,'agenda',?)").join(',')+" ON CONFLICT(phone,owner,channel) DO UPDATE SET emailsJson=(SELECT json_group_array(value) FROM (SELECT value FROM json_each(centralLeadSourceChannels.emailsJson) UNION SELECT value FROM json_each(excluded.emailsJson))),updatedAt=CURRENT_TIMESTAMP").bind(...chunk.flatMap(c=>[c.phone,source.owner,JSON.stringify(c.emails)])).run();}
 await protectInternalContacts(env);
 return Response.json({ok:true,processed:contacts.length,newContacts:contacts.length-existing,existingContacts:existing,skipped,us:contacts.filter(c=>isUSPhone(c.phone)).length,international:contacts.filter(c=>!isUSPhone(c.phone)).length},{headers:{'cache-control':'no-store'}});
 }catch(e){console.error('address_book_import_failed',e?.name||'Error');return Response.json({error:'Não foi possível importar este lote. Tente novamente; contatos repetidos serão unificados.'},{status:400});}
}
