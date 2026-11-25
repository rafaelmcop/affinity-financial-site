import test from 'node:test';import assert from 'node:assert/strict';
import {testimonialPagesRoute} from './worker/testimonial-pages.js';
import {testimonialPageFixture} from './test-support/testimonial-page-fixture.mjs';
const request=path=>new Request('https://www.affinityfc.org'+path);
test('individual marketing links expose only approved public content and same-language recommendations',async()=>{
 const f=testimonialPageFixture();try{
  const result=await testimonialPagesRoute(request('/depoimentos/1'),f.env),html=await result.text();
  assert.equal(result.status,200);assert(html.includes('Pessoa de exemplo'));assert(html.includes('Condição relatada'));assert(html.includes('100.000,00'));assert(html.includes('h=abcdef1234'));assert(html.includes('href="/depoimentos/2"'));assert(!html.includes('English video'));assert(!html.includes('PRIVATE UNPUBLISHED'));assert(!html.includes('private@example.invalid'));assert(!html.includes('private-agent@example.invalid'));assert.equal((html.match(/<iframe /g)||[]).length,1);assert(html.includes('https://www.affinityfc.org/depoimentos/1'));assert(html.includes('href="/#services"'));assert(result.headers.get('content-security-policy').includes("object-src 'none'"));
  for(const id of [4,5,999,'999999999999999999999999999999999999999'])assert.equal((await testimonialPagesRoute(request('/depoimentos/'+id),f.env)).status,404);
  const english=await(await testimonialPagesRoute(request('/depoimentos/3'),f.env)).text();assert(english.includes('<html lang="en">'));assert(english.includes('English story.'));assert(!english.includes('Pessoa de exemplo'));
  const list=await(await testimonialPagesRoute(request('/depoimentos?idioma=pt'),f.env)).text();assert(list.includes('/depoimentos/1'));assert(list.includes('/depoimentos/2'));assert(!list.includes('/depoimentos/3'));assert(!list.includes('PRIVATE UNPUBLISHED'));
 }finally{f.db.close()}
});
test('marketing pages escape published text, reject executable thumbnails and preserve HTTP boundaries',async()=>{
 const f=testimonialPageFixture();try{
  const html=await(await testimonialPagesRoute(request('/depoimentos/6'),f.env)).text();assert(html.includes('&lt;script&gt;'));assert(!html.includes('<svg onload='));assert(!html.includes('<img src=x'));assert(!html.includes('javascript:'));assert(html.includes('<video controls playsinline'));
  assert.equal(await(await testimonialPagesRoute(new Request('https://www.affinityfc.org/depoimentos/1',{method:'HEAD'}),f.env)).text(),'');
  assert.equal((await testimonialPagesRoute(new Request('https://www.affinityfc.org/depoimentos/1',{method:'POST'}),f.env)).status,405);
  assert.equal(await testimonialPagesRoute(request('/'),f.env),null);
 }finally{f.db.close()}
});
