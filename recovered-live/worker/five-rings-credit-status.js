// Missing optional production cards must not discard a complete client/policy capture.
export async function optionalFiveRingsCredits(refresh){
 try{await refresh();return {updated:true,warning:null};}
 catch(error){return {updated:false,warning:'Clientes e apólices sincronizados; créditos não atualizados: '+String(error?.message||'cartões indisponíveis').slice(0,400)};}
}
