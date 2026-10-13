import {featureCatalog,pageFeature} from '../public/portal-access-rules.js';
export const assistantCatalog=[...featureCatalog,['profile','Perfil e configurações','Conta']];
const actions=['view','edit','delete'];
export function normalizeAssistantPermissions(value){return Object.fromEntries(assistantCatalog.map(([key])=>{const selected=actions.filter(action=>Array.isArray(value?.[key])&&value[key].includes(action));return [key,selected.length?[...new Set(['view',...selected])]:[]];}));}
export function delegatedAccess(access){return {...access,isMaster:false,role:'agent',account:{...access.account,accountType:'agent',adminRole:'agent'}};}
export function permissionForPage(path,query){if(path==='/afiliados/dashboard')return 'referrals';if(path==='/agentes/inicio'&&query.get('configurar')==='1')return 'whatsapp_leads';if(path==='/agentes/configuracoes'||path==='/agent-email-settings.html')return path.includes('email')?'email':'profile';return pageFeature(path,query);}
export function hasAssistantAction(permissions,feature,action){return (Array.isArray(feature)?feature:[feature]).some(key=>permissions?.[key]?.includes('view')&&permissions[key].includes(action));}
