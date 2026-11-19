// whatsapp-web.js 1.34.7 spreads MediaData's internal __x_id into the outgoing
// message, overriding its own identity in newer WA Web builds. Upstream issue:
// https://github.com/wwebjs/whatsapp-web.js/issues/201921
// Install only inside the bridge-owned page. Keep the pinned dependency intact;
// this runtime adapter survives npm ci and checks its insertion boundary.
export function installMediaIdentityCompatibility(){
 const api=window.WWebJS,original=api?.sendMessage;
 if(typeof original!=='function')return {ok:false,reason:'missing_send_function'};
 if(original.affinityMediaIdentityFix)return {ok:true,alreadyInstalled:true};
 const source=original.toString(),marker="// Bot's won't reply";
 if(source.includes('delete message.__x_id;'))return {ok:true,upstreamFixed:true};
 if(!source.includes('const message = {')||source.split(marker).length!==2)return {ok:false,reason:'unsupported_send_function'};
 const patched=source.replace(marker,'delete message.__x_id;\n        '+marker);
 const fn=new Function('return ('+patched+');')();
 Object.defineProperty(fn,'affinityMediaIdentityFix',{value:true});
 api.sendMessage=fn;return {ok:true,patched:true};
}
