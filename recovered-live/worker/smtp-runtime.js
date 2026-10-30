import net from 'node:net';
import tls from 'node:tls';
import {smtpConnectionOptions} from './mail-health.js';

// Workers' DNS resolver can expose CNAME records to Nodemailer's address pool.
// Connect using the configured hostname so the runtime keeps DNS and TLS/SNI
// together. STARTTLS is still mandatory on 587; 465 starts with verified TLS.
export function runtimeSmtpOptions(config,connectors={plain:net.connect,secure:tls.connect}){
 const options=smtpConnectionOptions(config);
 return {...options,disableFileAccess:true,disableUrlAccess:true,getSocket(_options,callback){
  let socket,settled=false;
  const finish=error=>{
   if(settled)return;settled=true;clearTimeout(timer);
   socket?.removeListener('error',finish);
   if(error){socket?.destroy();callback(Object.assign(error,{command:'CONN',notSent:true}));}
   else callback(null,{connection:socket,secured:options.secure});
  };
  const timer=setTimeout(()=>finish(Object.assign(Error('Connection timeout'),{code:'ETIMEDOUT'})),options.connectionTimeout);
  try{
   const connect=options.secure?connectors.secure:connectors.plain;
   socket=connect({host:options.host,port:options.port,...options.secure?{servername:options.host,rejectUnauthorized:true}:{}},()=>finish());
   socket.once('error',finish);
  }catch(error){finish(error);}
 }};
}

export function emailDefinitelyNotSent(error){
 return error?.notSent===true||['EHLO','HELO','STARTTLS','AUTH','AUTH PLAIN','AUTH LOGIN','MAIL FROM','RCPT TO','API'].includes(String(error?.command||'').toUpperCase());
}
