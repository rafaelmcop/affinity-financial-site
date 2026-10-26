// The delivery receipt must reach the browser before CRM audit work finishes.
// waitUntil retains the audit after the response; the scheduled audit also
// provides recovery if a downstream history write is temporarily unavailable.
export async function afterWhatsAppReceipt(response,audit,waitUntil){
 if(response.status!==200)return;
 let receipt;try{receipt=await response.clone().json();}catch{return;}
 if(receipt.state!=='sent')return;
 const task=Promise.resolve().then(audit).catch(()=>console.error('whatsapp_send_audit_pending'));
 if(waitUntil)waitUntil(task);else await task;
}
