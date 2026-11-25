export const emailSetupComplete=settings=>settings?.passwordConfigured===true||settings?.oauth?.connected===true;
export const fiveRingsSetupComplete=connection=>!!(connection?.portalEmail&&connection?.passwordConfigured);
export const profileSetupComplete=profile=>!!(String(profile?.name||'').trim()&&String(profile?.phone||profile?.whatsapp||'').replace(/\D/g,'').length>=8&&String(profile?.messageSignature||'').trim());
