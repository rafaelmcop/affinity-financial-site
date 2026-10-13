import {procedureNames} from './security-boundary.js';
// Only operation names, numeric status and fixed error codes enter diagnostics.
export async function requestOutcomes(request,response){
 const path=new URL(request.url).pathname,names=path.startsWith('/api/trpc/')?procedureNames(path):[];
 if(!names.length)return [{path,httpStatus:response.status,...(response.status>=500?{errorCode:'request_failed'}:{})}];
 let entries;try{const value=await response.clone().json();entries=Array.isArray(value)?value:[value];}catch{entries=[];}
 return names.map((name,index)=>{const item=entries[index],error=item?.error?.json||item?.error;const status=Number(error?.data?.httpStatus)||((item?.result)?200:response.status===207?500:response.status);const code=error?.data?.code||error?.code;return {path:'/api/trpc/'+name,httpStatus:status,...(status>=500?{errorCode:typeof code==='string'&&/^[A-Z_]{1,80}$/.test(code)?code:'request_failed'}:{})};});
}
