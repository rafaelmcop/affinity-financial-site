export const meetingPurposes=[['client','Cliente'],['recruitment','Contratação'],['annual_review','Revisão anual']];
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function decorateMeetingPurposes(env,owner,rows){
 if(!rows.length)return rows;const table=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='meetingPurposes'").first(),values=new Map();
 if(table)for(let start=0;start<rows.length;start+=80){const ids=rows.slice(start,start+80).map(row=>Number(row.id));for(const row of (await env.DB.prepare('SELECT meetingId,purpose FROM meetingPurposes WHERE owner=? AND meetingId IN ('+ids.map(()=>'?').join(',')+')').bind(String(owner).toLowerCase(),...ids).all()).results||[])values.set(Number(row.meetingId),row.purpose);}
 return rows.map(row=>{const purpose=values.get(Number(row.id))||null;return{...row,purpose,purposeLabel:meetingPurposes.find(([key])=>key===purpose)?.[1]||null};});
}
export async function saveMeetingPurpose(env,owner,input,actor=owner){
 owner=String(owner).toLowerCase();const id=Number(input.meetingId),purpose=String(input.purpose||'');if(!Number.isSafeInteger(id)||id<1)throw fail('Compromisso inválido.');if(!meetingPurposes.some(([key])=>key===purpose))throw fail('Selecione o tipo de reunião.');
 const meeting=await env.DB.prepare('SELECT id FROM calendlyMeetings WHERE id=? AND lower(agentEmail)=?').bind(id,owner).first();if(!meeting)throw fail('Compromisso não encontrado.',404);
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS meetingPurposes(owner TEXT NOT NULL,meetingId INTEGER NOT NULL,purpose TEXT NOT NULL CHECK(purpose IN (\'client\',\'recruitment\',\'annual_review\')),updatedBy TEXT NOT NULL,updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner,meetingId))').run();
 await env.DB.prepare('INSERT INTO meetingPurposes(owner,meetingId,purpose,updatedBy) VALUES(?,?,?,?) ON CONFLICT(owner,meetingId) DO UPDATE SET purpose=excluded.purpose,updatedBy=excluded.updatedBy,updatedAt=CURRENT_TIMESTAMP').bind(owner,id,purpose,String(actor).toLowerCase()).run();
 return{success:true,purpose,purposeLabel:meetingPurposes.find(([key])=>key===purpose)[1]};
}
