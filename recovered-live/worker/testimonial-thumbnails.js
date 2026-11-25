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
  const cached=await env.DB.prepare("SELECT thumbnailUrl,CASE WHEN datetime(updatedAt)>datetime('now','-7 days') THEN 1 ELSE 0 END fresh FROM testimonialThumbnails WHERE testimonialId=? AND sourceKey=?").bind(id,key).first();
  let image=validCdn(cached?.thumbnailUrl);
  if(!image||!cached.fresh){
   try{
   const endpoint=new URL('https://vimeo.com/api/oembed.json');endpoint.searchParams.set('url',canonical);endpoint.searchParams.set('width','640');
   const response=await fetcher(endpoint,{redirect:'error',signal:AbortSignal.timeout(6000),headers:{accept:'application/json','user-agent':'AffinityFinancial-Testimonial-Covers/1.0 (https://www.affinityfc.org/)','referer':'https://www.affinityfc.org/'}});
   if(!response.ok)throw Object.assign(Error('thumbnail_unavailable'),{code:'provider_http_'+response.status});
   const refreshed=validCdn((await response.json()).thumbnail_url);if(!refreshed)throw Object.assign(Error('thumbnail_invalid'),{code:'provider_image_invalid'});image=refreshed;
   await env.DB.prepare('INSERT INTO testimonialThumbnails(testimonialId,sourceKey,thumbnailUrl) VALUES(?,?,?) ON CONFLICT(testimonialId) DO UPDATE SET sourceKey=excluded.sourceKey,thumbnailUrl=excluded.thumbnailUrl,updatedAt=CURRENT_TIMESTAMP').bind(id,key,image).run();
   }catch(error){console.warn('testimonial_thumbnail_unavailable',{provider:'vimeo',category:error.code||error.name||'metadata_unavailable'});if(!image)throw error;}
  }
  return new Response(null,{status:302,headers:{...headers,location:image}});
 }catch{return new Response(null,{status:404,headers:{'cache-control':'no-store'}});}
}
