export const whatsappAutomationPaused=env=>String(env.WHATSAPP_AUTOMATIONS_PAUSED).toLowerCase()==='true';
export const isAutomaticWhatsapp=input=>input?.automation===true||input?.meetingReminder===true;
export function pausedMeetingChannels(config,env){if(!whatsappAutomationPaused(env))return config;return {...config,whatsappPaused:true,stages:Object.fromEntries(Object.entries(config.stages).map(([key,stage])=>[key,{...stage,whatsapp:false}]))};}
