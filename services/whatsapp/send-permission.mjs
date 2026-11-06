export function sendAllowed(env,input){
 const automated=input?.automation===true||input?.meetingReminder===true;
 if(automated)return (env.WHATSAPP_MEETING_REMINDERS_ENABLED==='true'&&input.meetingReminder===true&&['day_before','half_hour'].includes(input.stage)&&Number.isSafeInteger(input.meetingId)&&input.meetingId>0)||(env.WHATSAPP_BIRTHDAY_SEND_ENABLED==='true'&&input.automation===true&&input.occasion==='birthday');
 return env.WHATSAPP_SEND_ENABLED==='true'||(env.WHATSAPP_MANUAL_SEND_ENABLED==='true'&&input?.manual===true);
}
