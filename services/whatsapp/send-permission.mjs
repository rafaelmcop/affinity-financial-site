export function sendAllowed(env,input){
return (env.WHATSAPP_AUTOMATION_SEND_ENABLED==='true'&&input?.automation===true)||env.WHATSAPP_SEND_ENABLED==='true'||(env.WHATSAPP_MANUAL_SEND_ENABLED==='true'&&input?.manual===true);
}
