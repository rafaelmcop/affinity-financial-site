import {getVideoSource} from '../public/video-source.js';
const validCdn=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&(url.hostname==='vimeocdn.com'||url.hostname.endsWith('.vimeocdn.com'))?url.href:null}catch{return null}};
export async function testimonialThumbnailRoute(request,env,fetcher=fetch){
 const url=new URL(request.url),match=/^\/api\/public\/testimonial-thumbnail\/(\d+)$/.exec(url.pathname);if(!match)return null;
 const headers={'cache-control':'public, max-age=300','x-content-type-options':'nosniff'};
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{allow:'GET, HEAD','cache-control':'no-store'}});
 const id=Number(match[1]);if(!Number.isSafeInteger(id)||id<=0)return new Response(null,{status:404});
 const row=await env.DB.prepare("SELECT mediaUrl FROM testimonials WHERE id=? AND isActive=1 AND mediaType='video'").bind(id).first(),source=getVideoSource(row?.mediaUrl);
 if(!source)return new Response(null,{status:404,headers:{'cache-control':'no-store'}});
 if(source.kind==='youtube'){const videoId=new URL(source.embedUrl).pathname.split('/').pop();return new Response(null,{status:302,headers:{...headers,location:'https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg'}});}
 if(source.kind!=='vimeo')return new Response(null,{status:404,headers:{'cache-control':'no-store'}});
 const embed=new URL(source.embedUrl),videoId=embed.pathname.split('/').pop(),canonical='https://vimeo.com/'+videoId+(embed.searchParams.get('h')?'/'+embed.searchParams.get('h'):''),key=canonical;
 try{
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS testimonialThumbnails(testimonialId INTEGER PRIMARY KEY,sourceKey TEXT NOT NULL,thumbnailUrl TEXT NOT NULL,updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)').run();
  const cached=await env.DB.prepare("SELECT thumbnailUrl FROM testimonialThumbnails WHERE testimonialId=? AND sourceKey=? AND datetime(updatedAt)>datetime('now','-7 days')").bind(id,key).first();
  let image=validCdn(cached?.thumbnailUrl);
  if(!image){
   const endpoint=new URL('https://vimeo.com/api/oembed.json');endpoint.searchParams.set('url',canonical);endpoint.searchParams.set('width','640');
   const response=await fetcher(endpoint,{redirect:'error',signal:AbortSignal.timeout(6000),headers:{accept:'application/json'}});
   if(!response.ok)throw Error('thumbnail_unavailable');
   image=validCdn((await response.json()).thumbnail_url);if(!image)throw Error('thumbnail_invalid');
   await env.DB.prepare('INSERT INTO testimonialThumbnails(testimonialId,sourceKey,thumbnailUrl) VALUES(?,?,?) ON CONFLICT(testimonialId) DO UPDATE SET sourceKey=excluded.sourceKey,thumbnailUrl=excluded.thumbnailUrl,updatedAt=CURRENT_TIMESTAMP').bind(id,key,image).run();
  }
  return new Response(null,{status:302,headers:{...headers,location:image}});
 }catch{return new Response(null,{status:404,headers:{'cache-control':'no-store'}});}
}
