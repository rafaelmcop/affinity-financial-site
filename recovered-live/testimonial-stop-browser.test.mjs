import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {launchBrowser} from './test-support/browser.mjs';

test('next, previous and dots stop native videos and destroy old Vimeo/YouTube players in every language',async()=>{
 const rows=['pt','en','es'].flatMap((language,index)=>[
  {id:index*3+1,name:'Vimeo '+language,language,mediaUrl:'https://vimeo.com/123456789/abcdef1234'},
  {id:index*3+2,name:'YouTube '+language,language,mediaUrl:'https://www.youtube.com/watch?v=abcdefghijk'},
  {id:index*3+3,name:'File '+language,language,mediaUrl:'/media/synthetic.mp4'}
 ].map(row=>({...row,role:'Benefício',quote:'Depoimento de teste',mediaType:'video',source:'curated',rating:5,thumbnailUrl:'/synthetic.jpg'})));
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/trpc/')){
    const value=name=>name==='testimonials.getLocalized'?rows:null;
    const output=url.pathname.slice('/api/trpc/'.length).split(',').map(name=>({result:{data:{json:value(name)}}}));
    res.setHeader('content-type','application/json');res.end(JSON.stringify(url.searchParams.has('batch')?output:output[0]));return;
   }
   const path=url.pathname==='/'?'/index.html':url.pathname;
   let body=await readFile(new URL('./public'+path,import.meta.url));
   if(path==='/index.html')body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script type="module" src="/assets/index-BIU-6RMI.js"></script></body>');
   res.setHeader('content-type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(body);
  }catch{res.statusCode=404;res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port,browser=await launchBrowser();
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request',request=>{
   if(/^https:\/\/(player\.vimeo\.com|www\.youtube-nocookie\.com)/.test(request.url()))return void request.respond({status:200,contentType:'text/html',body:'<button>Native test play</button>'});
   if(!request.url().startsWith(base)&&!request.url().startsWith('data:'))return void request.abort();
   void request.continue();
  });
  await page.goto(base);
  for(const language of ['pt','en','es']){
   await page.evaluate(value=>localStorage.setItem('affinity-language',value),language);
   await page.reload();await page.waitForSelector('#testimonials .testimonial-fixed-card');
   const seen=new Set();
   const advance=async selector=>{
    const kind=await page.evaluate(()=>{
     const player=document.querySelector('#testimonials iframe,#testimonials video');window.previousTestimonialPlayer=player;
     if(player.tagName==='VIDEO'){
      window.nativeWasPaused=false;let time=12;
      player.pause=()=>{window.nativeWasPaused=true};
      Object.defineProperty(player,'currentTime',{configurable:true,get:()=>time,set:value=>{time=value}});
      return 'file';
     }
     return player.src.includes('vimeo.com')?'vimeo':'youtube';
    });
    seen.add(kind);
    await page.click(selector);
    await page.waitForFunction(()=>!window.previousTestimonialPlayer.isConnected);
    assert.equal(await page.$$('#testimonials .testimonial-fixed-card').then(cards=>cards.length),1);
    if(kind==='file'){
     assert.equal(await page.evaluate(()=>window.nativeWasPaused),true);
     assert.equal(await page.evaluate(()=>window.previousTestimonialPlayer.currentTime),0);
    }
   };
   for(let n=0;n<3;n++)await advance('#testimonials button[aria-label="'+({pt:'Próximo depoimento',en:'Next testimonial',es:'Siguiente testimonio'})[language]+'"]');
   assert.deepEqual([...seen].sort(),['file','vimeo','youtube']);
   await advance('#testimonials button[aria-label="'+({pt:'Depoimento anterior',en:'Previous testimonial',es:'Testimonio anterior'})[language]+'"]');
   await advance('#testimonials button[aria-label="Ir para depoimento 1"]');
  }
  assert.deepEqual(errors,[]);
 }finally{
  for(const page of await browser.pages())await page.close({runBeforeUnload:false});
  await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 }
});
