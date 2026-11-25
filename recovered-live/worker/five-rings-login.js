export function fiveRingsLoginBody(html,email,password,token){
const body=new URLSearchParams({_token:token,email,password});
for(const match of String(html).matchAll(/<input\b[^>]*>/gi)){
const input=match[0],name=input.match(/name=["']([^"']+)["']/i)?.[1],value=input.match(/value=["']([^"']*)["']/i)?.[1]||'1';
if(name&&/type=["']checkbox["']/i.test(input)&&/remember|trust|device/i.test(name+' '+input))body.set(name,value);
}
return body;
}
