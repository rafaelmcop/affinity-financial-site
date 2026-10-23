// Explicit query allowlist: new mutations are POST-only by default.
const queries = new Set(["crm.getClient","agent.listEmailReviews","agent.getEmailReview","agent.getMeetingCopySettings", "address.search", "auth.me", "system.ping", "admin.getEmailConfig", "admin.getPendingAffiliates", "admin.getPoliciesPending", "admin.getStats", "admin.listAdmins", "admin.listAffiliates", "admin.getAllAffiliates", "admin.listAffiliateLeads", "admin.systemSyncLogs", "admin.fiveRingsRequirements", "admin.policyLeadReviews", "admin.marketingObligations", "admin.agentNumberDefault", "admin.affiliateReferenceRates", "admin.affiliateWhatsappSources", "affiliate.getDashboard", "agent.automationSubscriptions", "agent.calendlyMeetings", "agent.calendlyRecap", "agent.calendlyRecaps", "agent.clientEmails", "agent.dashboard", "agent.deliveryLog", "agent.fiveRingsCredits", "agent.getApplication", "agent.getApplicationDocument", "agent.getCalendly", "agent.getEmailSettings", "agent.getFiveRingsConnection", "agent.getNationalLifeConnection", "agent.getPaymentReturnTemplate", "agent.getProfile", "agent.getPublicProfile", "agent.getWelcomeTemplate", "agent.listApplications", "agent.listAssignedReviews", "agent.listClientDeletionRequests", "agent.listClients", "agent.listDirectContacts", "agent.listMessages", "agent.listPolicies", "agent.listTasks", "agent.mailbox", "agent.mailboxClients", "agent.mailboxFolders", "agent.mailboxMessage", "agent.messageHistory", "agent.paymentCase", "agent.pendingCounts", "agent.birthdayAlerts", "agent.weekMeetings", "agent.meetingDetail", "agent.applicationAgentDetails", "calendly.publicProfile", "careers.access", "careers.list", "crm.activities", "crm.agentPortfolio", "crm.assignees", "crm.communicationAudit", "crm.list", "crm.listClientDeletionRequests", "crm.internalMessages", "crm.internalUnreadCount", "crm.presence", "crm.userAuditHistory", "crm.userInternalHistory", "crm.clientAutomations", "passwordReset.validateToken", "reviewInvites.get", "serviceFeedback.get", "testimonials.getActive", "testimonials.getAgentOptions", "testimonials.getAll", "testimonials.getLocalized"]);
export function procedureNames(path) {
 try {const names=decodeURIComponent(path.slice('/api/trpc/'.length)).split(',');return names.length<=30&&names.every(n=>/^[a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z][a-zA-Z0-9_]*$/.test(n))?names:[];}catch{return [];}
}
export function trpcBoundary(request) {
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/trpc/'))return null;
 const deny=(status,error)=>Response.json({error},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 const names=procedureNames(url.pathname);if(!names.length)return deny(400,'Operação inválida.');
 if(request.method==='GET')return names.every(n=>queries.has(n))?(url.search.length>65536?deny(413,'Consulta muito grande.'):null):deny(405,'Esta operação exige POST.');
 if(request.method!=='POST')return deny(405,'Método inválido.');
 const origin=request.headers.get('origin');if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')return deny(403,'Origem não autorizada.');
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return deny(415,'Envie JSON.');
 if(Number(request.headers.get('content-length'))>16*1024*1024)return deny(413,'Arquivo muito grande.');
 return null;
}
export function globalTestimonialsAllowed(name,accountType){return !name.startsWith('testimonials.')||['admin','both'].includes(accountType);}
export async function boundedJson(request,max=16*1024*1024){
 const reader=request.body?.getReader();if(!reader)return {};let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Object.assign(Error('Arquivo muito grande.'),{httpStatus:413});}chunks.push(value);}
 try{return JSON.parse(await new Blob(chunks).text());}catch{throw Object.assign(Error('JSON inválido.'),{httpStatus:400});}
}
