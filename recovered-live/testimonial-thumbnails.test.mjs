import test from 'node:test';import assert from 'node:assert/strict';
import {testimonialThumbnailRoute} from './worker/testimonial-thumbnails.js';import {testimonialPageFixture} from './test-support/testimonial-page-fixture.mjs';
function fixture(){const f=testimonialPageFixture(),original=f.env.DB.prepare.bind(f.env.DB);f.env.DB.prepare=sql=>{let args=[];const statement=original(sql);return{bind(...values){args=values;statement.bind(...values);return this},first:()=>statement.first(),async run(){return{meta:f.db.prepare(sql).run(...args)}}}};return f;}
const request=id=>new Request('https://www.affinityfc.org/api/public/testimonial-thumbnail/'+id);
test('official Vimeo covers preserve private hashes, cache only validated CDN URLs and never expose unpublished videos',async()=>{
 const f=fixture();let calls=0;try{
  const fetcher=async url=>{calls++;assert.equal(url.hostname,'vimeo.com');assert.equal(url.pathname,'/api/oembed.json');assert.equal(url.searchParams.get('url'),'https://vimeo.com/123456789/abcdef1234');return Response.json({thumbnail_url:'https://i.vimeocdn.com/video/12345_640.jpg'})};
  for(let n=0;n<2;n++){const response=await testimonialThumbnailRoute(request(1),f.env,fetcher);assert.equal(response.status,302);assert.equal(response.headers.get('location'),'https://i.vimeocdn.com/video/12345_640.jpg');}assert.equal(calls,1);
  assert.equal((await testimonialThumbnailRoute(request(4),f.env,fetcher)).status,404);assert.equal(calls,1);
  const youtube=await testimonialThumbnailRoute(request(2),f.env,fetcher);assert.equal(youtube.headers.get('location'),'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');assert.equal(calls,1);
  f.db.prepare('UPDATE testimonials SET mediaUrl=? WHERE id=1').run('https://vimeo.com/987654321');const bad=await testimonialThumbnailRoute(request(1),f.env,async()=>Response.json({thumbnail_url:'https://vimeocdn.com.evil.invalid/track'}));assert.equal(bad.status,404);
  assert.equal((await testimonialThumbnailRoute(request('9999999999999999999999999'),f.env,fetcher)).status,404);
  assert.equal((await testimonialThumbnailRoute(new Request('https://www.affinityfc.org/api/public/testimonial-thumbnail/1',{method:'POST'}),f.env,fetcher)).status,405);
 }finally{f.db.close()}
});
