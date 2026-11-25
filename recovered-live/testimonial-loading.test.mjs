import test from 'node:test';
import assert from 'node:assert/strict';
import {loadPublishedTestimonials} from './worker/testimonial-loading.js';

test('a slow translation does not hold back published reviews or videos and concurrent work is reused',async()=>{
 const rows=[{id:1,language:'pt',quote:'Synthetic review'},{id:2,language:'pt',mediaType:'video',mediaUrl:'/media/test.mp4'}];
 const env={DB:{}},background=[];
 let finish,calls=0;
 const translate=()=>{calls++;return new Promise(resolve=>finish=resolve)};
 const context={waitUntil:promise=>background.push(promise)};
 const results=await Promise.all([
  loadPublishedTestimonials(rows,'en',env,context,translate,5),
  loadPublishedTestimonials(rows,'en',env,context,translate,5)
 ]);
 assert.deepEqual(results,[rows.slice(0,1),rows.slice(0,1)]);assert.equal(calls,1);
 finish(rows.map(row=>({...row,displayedLanguage:'en'})));
 await Promise.all(background);
});
test('cached translations are used immediately and failures fall back to the published originals',async()=>{
 const rows=[{id:1,language:'pt',quote:'Original'}],translated=[{id:1,language:'pt',displayedLanguage:'en',quote:'Translated'}];
 assert.deepEqual(await loadPublishedTestimonials(rows,'en',{DB:{}},null,async()=>translated),translated);
 assert.deepEqual(await loadPublishedTestimonials(rows,'en',{DB:{}},null,async()=>{throw Error('unavailable')}),rows);
 let calls=0;
 assert.deepEqual(await loadPublishedTestimonials(rows,'pt',{DB:{}},null,async()=>{calls++;return[]}),rows);assert.equal(calls,0);
});

test('videos match only their recorded language while written reviews remain available for translation',async()=>{
 const rows=[{id:1,language:'pt',quote:'Review'},...['pt','en','es'].map((language,index)=>({id:index+2,language,mediaType:'video',mediaUrl:'/media/test.mp4'}))];
 for(const language of ['pt','en','es'])for(const fails of [false,true]){
  const result=await loadPublishedTestimonials(rows,language,{DB:{}},null,async selected=>{assert(selected.every(row=>row.mediaType!=='video'||row.language===language));if(fails)throw Error('offline');return selected;});
  assert.deepEqual(result.filter(row=>row.mediaType==='video').map(row=>row.language),[language]);assert(result.some(row=>row.id===1));
 }
 assert.deepEqual(await loadPublishedTestimonials(rows.filter(row=>row.id!==1),'fr',{DB:{}},null,async()=>{throw Error('must not translate videos')}),[]);
});
