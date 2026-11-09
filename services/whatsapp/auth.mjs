import {createHmac, timingSafeEqual} from 'node:crypto';
export function verifyTicketClaims(ticket, secret, now=Math.floor(Date.now()/1000)) {
  const [payload, signature, extra]=String(ticket||'').split('.');
  if(!payload||!signature||extra||payload.length>2048)throw Error('Unauthorized');
  const expected=createHmac('sha256',secret).update(payload).digest();
  const actual=Buffer.from(signature,'base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Unauthorized');
  const data=JSON.parse(Buffer.from(payload,'base64url').toString());
  if(data.aud!=='affinity-whatsapp'||typeof data.owner!=='string'||!data.owner.includes('@')||!Number.isInteger(data.exp)||data.exp<now||data.exp>now+120)throw Error('Unauthorized');
  if(data.mode!==undefined&&(!['disabled','send','full'].includes(data.mode)||!Number.isSafeInteger(data.revision)||data.revision<0))throw Error('Unauthorized');return {...data,owner:data.owner.trim().toLowerCase()};
}

export function verifyTicket(ticket,secret,now){return verifyTicketClaims(ticket,secret,now).owner;}
