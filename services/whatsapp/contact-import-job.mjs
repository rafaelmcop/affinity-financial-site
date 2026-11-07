export function contactImportJob(session,read,now=Date.now(),report=()=>{}) {
 const current=session.allContactsJob;
 if(!current||current.error&&now>=current.retryAt){
  const attempts=(current?.attempts||0)+1;
  const job={result:null,error:false,progress:{},attempts,retryAt:0};session.allContactsJob=job;
  job.promise=Promise.resolve().then(()=>read(p=>job.progress=p)).then(result=>{job.result=result;}).catch(error=>{
   job.error=true;job.retryAt=Date.now()+Math.min(300000,30000*2**Math.min(attempts-1,4));
   const reason=String(error?.message||'Falha na preparação').replace(/[\w.+-]+@[\w.-]+/g,'[conta]').replace(/\b\d{8,}\b/g,'[id]').slice(0,180);
   report({event:'whatsapp_contact_import_failed',name:error?.name||'Error',reason});
  });
 }
 return session.allContactsJob;
}
