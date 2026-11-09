// Owner-authorized structured discovery. No arbitrary SQL, medical fields or full bank numbers.
const safe=(v,n=160)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').slice(0,n);
const norm=v=>safe(v,400).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const nyDay=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'';};
const validDay=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export async function findAiClients(env,identity,plan,{allowed,bankSummary}={}){
 const owner=String(identity.owner).toLowerCase(),admin=identity.admin===true,global=admin&&identity.allOwners===true;
 if(!admin&&!await allowed('policies'))throw Object.assign(Error('O acesso aos clientes não está liberado.'),{status:403});
 const apps=admin||await allowed('applications')||await allowed('application_create'),calendar=admin||await allowed('calendar');
 const filters=plan.filters&&typeof plan.filters==='object'?plan.filters:{},from=validDay(filters.from)?filters.from:'',to=validDay(filters.to)?filters.to:from;
 if(from&&!calendar)throw Object.assign(Error('O acesso ao histórico da agenda não está liberado.'),{status:403});
 const sql=async(statement,params=[])=>(await env.DB.prepare(statement).bind(...params).all()).results||[];
 const clients=await sql('SELECT id,name,email,phone,address,birthDate FROM crmClients WHERE '+(global?'1=1':'lower(assignedAdminEmail)=?')+' ORDER BY id DESC LIMIT 1001',global?[]:[owner]);
 // Owner is always returned separately, never inferred from phone/email shared by a family.
 const ownership=global?await sql('SELECT id,assignedAdminEmail FROM crmClients ORDER BY id DESC LIMIT 1001'):[];
 const owners=new Map(ownership.map(c=>[Number(c.id),String(c.assignedAdminEmail||'').toLowerCase()]));
 const appRows=apps?await sql("SELECT id,agentEmail,clientName,clientEmail,clientPhone,address,birthDate,city,state,maritalStatus,beneficiaryName,beneficiaryRelationship,premiumBudget,CASE WHEN json_valid(applicationData) THEN json_extract(applicationData,'$.spouseName') END spouseName,CASE WHEN json_valid(applicationData) THEN json_extract(applicationData,'$.paymentDay') END paymentDay,CASE WHEN json_valid(applicationData) THEN json_extract(applicationData,'$.draftDay') END draftDay FROM agentApplications WHERE "+(global?'1=1':'lower(agentEmail)=?')+' ORDER BY id DESC LIMIT 1001',global?[]:[owner]):[];
 const meetings=calendar&&from?await sql('SELECT id,agentEmail,clientId,inviteeName,startTime,status FROM calendlyMeetings WHERE '+(global?'1=1':'lower(agentEmail)=?')+" AND date(startTime)>=date(?,'-1 day') AND date(startTime)<=date(?,'+1 day') ORDER BY startTime LIMIT 1001",[...(global?[]:[owner]),from,to]):[];
 const policies=plan.financial?await sql('SELECT agentEmail,clientId,clientName,policyNumber,status,premiumAmount,premiumFrequency FROM agentPolicies WHERE '+(global?'1=1':'lower(agentEmail)=?')+' ORDER BY id DESC LIMIT 1001',global?[]:[owner]):[];
 const candidates=[];
 const matches=(record,app)=>{const name=norm(filters.name||plan.search),state=norm(filters.state),city=norm(filters.city),spouse=norm(filters.spouse),marital=norm(filters.maritalStatus);if(name&&!norm(record.name).includes(name))return false;
 if(state){const canonical=v=>norm(v)==='florida'?'fl':norm(v);const known=canonical(app?.state);const address=' '+norm(record.address).replace(/[^a-z0-9]+/g,' ')+' ';if(known?known!==canonical(state):!address.includes(' '+canonical(state)+' '))return false;}
 if(city&&!norm(app?.city||record.address).includes(city))return false;
 const explicitSpouse=app?.spouseName||(/^(spouse|wife|husband|conjuge|esposa|marido)$/i.test(norm(app?.beneficiaryRelationship))?app.beneficiaryName:'');
 if(spouse&&!norm(explicitSpouse).includes(spouse))return false;if(marital&&!norm(app?.maritalStatus).includes(marital))return false;return true;};
 for(const c of clients){const scopedOwner=global?owners.get(Number(c.id)):owner;if(!scopedOwner)continue;
 const app=appRows.find(a=>String(a.agentEmail).toLowerCase()===scopedOwner&&norm(a.clientName)===norm(c.name)&&(!a.birthDate||!c.birthDate||a.birthDate===c.birthDate)&&(!a.clientEmail||!c.email||norm(a.clientEmail)===norm(c.email)));
 if(!matches(c,app))continue;
 const attendance=from?meetings.filter(m=>String(m.agentEmail).toLowerCase()===scopedOwner&&Number(m.clientId)===Number(c.id)&&nyDay(m.startTime)>=from&&nyDay(m.startTime)<=to):[];
 if(from&&!attendance.length)continue;
 candidates.push({name:safe(c.name),email:safe(c.email,254),phone:safe(c.phone,40),address:safe(c.address),city:safe(app?.city),state:safe(app?.state),maritalStatus:safe(app?.maritalStatus),spouseName:safe(app?.spouseName||(/^(spouse|wife|husband|conjuge|esposa|marido)$/i.test(norm(app?.beneficiaryRelationship))?app.beneficiaryName:'')),owner:admin?scopedOwner:undefined,applicationId:app?.id||null,clientId:Number(c.id),meetings:attendance.map(m=>({date:m.startTime,status:safe(m.status),href:'/agentes/compromisso?meetingId='+Number(m.id)})),policies:plan.financial?policies.filter(p=>String(p.agentEmail).toLowerCase()===scopedOwner&&Number(p.clientId)===Number(c.id)&&norm(p.clientName)===norm(c.name)).map(p=>({number:safe(p.policyNumber),status:safe(p.status),premium:p.premiumAmount,frequency:safe(p.premiumFrequency)})):undefined,proposedPremium:plan.financial?app?.premiumBudget:undefined,paymentDay:plan.financial?(app?.paymentDay||app?.draftDay||null):undefined,href:'/agentes/cliente?clientId='+Number(c.id),_owner:scopedOwner});
 }
 // Also find an application that has not yet created a CRM record.
 if(!from)for(const a of appRows){if(clients.some(c=>norm(c.name)===norm(a.clientName)&&(global?owners.get(Number(c.id)):owner)===String(a.agentEmail).toLowerCase()))continue;const c={name:a.clientName};if(!matches(c,a))continue;candidates.push({name:safe(a.clientName),email:safe(a.clientEmail,254),phone:safe(a.clientPhone,40),address:safe(a.address),city:safe(a.city),state:safe(a.state),maritalStatus:safe(a.maritalStatus),spouseName:safe(a.spouseName||(/^(spouse|wife|husband|conjuge|esposa|marido)$/i.test(norm(a.beneficiaryRelationship))?a.beneficiaryName:'')),applicationId:Number(a.id),owner:admin?String(a.agentEmail).toLowerCase():undefined,proposedPremium:plan.financial?a.premiumBudget:undefined,paymentDay:plan.financial?(a.paymentDay||a.draftDay||null):undefined,href:'/agent-applications?applicationId='+Number(a.id),_owner:String(a.agentEmail).toLowerCase()});}
 const limited=candidates.length>20||clients.length>1000||appRows.length>1000||meetings.length>1000||policies.length>1000;
 const records=candidates.slice(0,20);if(plan.financial&&records.length===1&&records[0].applicationId&&apps&&bankSummary){const r=records[0];const bank=await bankSummary(r.applicationId,r._owner);r.bank=bank?{name:safe(bank.name),accountLast4:/^\d{4}$/.test(bank.last4)?bank.last4:null}:null;}
 for(const r of records)delete r._owner;
 return {records,limited,sources:[{module:'cadastro, aplicações e histórico autorizados',status:'consultado',shown:records.length,limited}],actions:[{label:'Abrir clientes',href:admin?'/admin/usuarios':'/agentes/crm/quadro'}],scope:'Somente correspondências documentadas. Campos ausentes não foram inferidos. Reunião agendada não comprova atendimento realizado. Prêmio previsto na aplicação não comprova emissão nem valor cobrado. Dia de débito ausente é desconhecido. Conta bancária apenas últimos quatro dígitos; número completo somente na ficha protegida. Se houver mais de uma pessoa, peça confirmação antes de identificar.'};
}
