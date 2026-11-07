import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {emailOAuthToken} from './worker/email-oauth.js';
const tenant='9188040d-6c67-4c5b-b112-36a304b66dad';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'fixture-key',use:'sig',alg:'RS256'};
function idToken(tamper=false){const now=Math.floor(Date.now()/1000);const segments=[{alg:'RS256',kid:jwk.kid},{iss:`https://login.microsoftonline.com/${tenant}/v2.0`,tid:tenant,aud:'fixture-client',sub:'fixture-user',iat:now,exp:now+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url'));const data=segments.join('.');return data+'.'+(tamper?Buffer.alloc(256).toString('base64url'):sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url'));}
function database(provider='microsoft'){const updates=[];const row={provider,email:'fixture@example.invalid',encryptedAccess:'sealed:old-access',encryptedRefresh:'sealed:refresh',expiresAt:new Date(0).toISOString()};return {updates,DB:{batch:async()=>[],prepare(sql){return {bind(...args){return {...this,args};},async first(){if(sql.startsWith('SELECT * FROM agentEmailOAuth'))return row;if(sql.startsWith('SELECT clientId'))return {clientId:'fixture-client',encryptedSecret:'sealed:client-secret'};throw Error('Unexpected fixture query');},async run(){updates.push(this.args);return {meta:{changes:1}};}};}}};}
test('Microsoft renewal accepts its signed tenant issuer and rejects a tampered ID token before persisting',async()=>{
 const original=globalThis.fetch;let tamper=false;const calls=[];
 globalThis.fetch=async(url)=>{const address=String(url);calls.push(address);if(address.endsWith('/token'))return Response.json({access_token:'renewed-access',refresh_token:'renewed-refresh',token_type:'Bearer',expires_in:3600,id_token:idToken(tamper)});if(address.endsWith('/keys'))return Response.json({keys:[jwk]});throw Error('Unexpected network destination');};
 const secrets={open:async s=>s.slice(7),seal:async s=>'sealed:'+s};
 try{const good=database('microsoft_graph');const auth=await emailOAuthToken({DB:good.DB,PORTAL_MULTITENANT_MODE:'enabled'},'fixture-owner@example.invalid',secrets);assert.equal(auth.accessToken,'renewed-access');assert.equal(good.updates.length,1);assert.equal(good.updates[0][0],'sealed:renewed-access');assert(calls.some(u=>u.endsWith('/keys')));tamper=true;const bad=database();await assert.rejects(()=>emailOAuthToken({DB:bad.DB,PORTAL_MULTITENANT_MODE:'enabled'},'fixture-owner@example.invalid',secrets));assert.equal(bad.updates.length,0);}finally{globalThis.fetch=original;}
});
