// Reuse only the same person's approved agent identity; never a different user's import or session.
export async function sharedAgentImport(env,staff){
 if(staff.kind!=='affiliate')return null;
 const agent=await env.DB.prepare("SELECT a.email,a.name,a.phone,p.phone AS profilePhone,p.avatar,p.completed,j.state AS importState FROM adminAccounts a LEFT JOIN staffOnboarding p ON p.owner='agent:'||lower(a.email) LEFT JOIN staffContactImports j ON j.owner='agent:'||lower(a.email) WHERE lower(a.email)=lower(?) AND a.isActive=1 AND a.status='approved' AND a.accountType IN ('agent','both') AND (p.completed=1 OR j.state='done')").bind(staff.email).first();
 return agent?{...agent,kind:'agent',owner:'agent:'+agent.email.toLowerCase(),email:agent.email.toLowerCase(),phone:agent.profilePhone||agent.phone||'',bridgeOwner:agent.email.toLowerCase()}:null;
}
export async function staffImportIdentity(env,staff){return await sharedAgentImport(env,staff)||{...staff,bridgeOwner:staff.kind==='affiliate'?'affiliate-'+staff.id+'@affinity-whatsapp.invalid':staff.email.toLowerCase()};}
