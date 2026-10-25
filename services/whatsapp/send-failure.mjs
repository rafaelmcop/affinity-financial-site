// Structural diagnostics only: never persist arbitrary exception text, message
// content, contact names, phone numbers, tokens or URLs.
export function sendFailureHint(error){
 const text=String(error?.message||'');
 const property=text.match(/Cannot read properties of (?:undefined|null) \(reading '([A-Za-z_$][A-Za-z0-9_$]{0,60})'\)/);
 if(property)return 'missing_property:'+property[1];
 if(/No LID for user/.test(text))return 'lid_mapping_missing';
 if(/is not a function/.test(text))return 'web_function_unavailable';
 if(/upload failed|media-fault/.test(text))return 'media_upload_failed';
 if(/Evaluation failed/.test(text))return 'web_evaluation_failed';
 return 'unclassified';
}
export function sendFailureText(code){
 return ({number_not_registered:'Este telefone não foi encontrado no WhatsApp. Confira o país e o número.',media_rejected:'O WhatsApp recusou o anexo. Confira a conversa no celular antes de tentar novamente.',media_preparation_failed:'O WhatsApp não conseguiu preparar o anexo. Confira a conversa antes de tentar novamente.',no_confirmation:'O WhatsApp ainda não confirmou a mensagem. Confira a conversa antes de tentar novamente.',session_interrupted:'A conexão do WhatsApp foi interrompida durante o envio. Confira a conversa antes de tentar novamente.',timeout:'O WhatsApp demorou a confirmar o envio. Confira a conversa antes de tentar novamente.'})[code]||'Não foi possível confirmar o envio no WhatsApp. Confira a conversa antes de tentar novamente.';
}
export function recordSendFailure(db,owner,requestId,error,code){
 const stage=['number_lookup','dispatch','confirmation'].includes(error?.whatsappStage)?error.whatsappStage:'dispatch';
 const id=error?.whatsappMessage?.id?._serialized||null;
 db.prepare("UPDATE sends SET state='uncertain',messageId=coalesce(?,messageId),errorCode=?,failureStage=?,errorHint=? WHERE owner=? AND requestId=?").run(id,code,stage,sendFailureHint(error),owner,requestId);
 return {stage,messageId:id};
}
