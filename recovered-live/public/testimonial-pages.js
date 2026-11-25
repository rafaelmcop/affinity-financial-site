const share=document.querySelector('[data-share]');
share?.addEventListener('click',async()=>{const status=document.querySelector('[data-share-status]');try{await navigator.clipboard.writeText(document.querySelector('link[rel=canonical]').href);status.textContent=share.dataset.copied;}catch{status.textContent=share.dataset.error;}});
for(const video of document.querySelectorAll('video'))video.addEventListener('error',()=>{document.querySelector('.player-error')?.removeAttribute('hidden');});
window.addEventListener('pagehide',()=>{for(const video of document.querySelectorAll('video')){video.pause();video.removeAttribute('src');video.load();}for(const frame of document.querySelectorAll('.focused-player iframe'))frame.remove();});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});

// Swap only after an explicit choice; destroying the old frame stops its audio.
document.querySelector('[data-youtube-standard]')?.addEventListener('click',event=>{
 const frame=document.querySelector('.focused-player iframe');if(!frame)return;
 const current=new URL(frame.src);if(current.hostname!=='www.youtube-nocookie.com')return;
 current.hostname='www.youtube.com';current.searchParams.set('origin',location.origin);
 const replacement=frame.cloneNode(false);replacement.src=current.href;frame.replaceWith(replacement);
 event.currentTarget.textContent=event.currentTarget.dataset.activeLabel;event.currentTarget.disabled=true;
});
const fallback='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#e9f0f6"/><path d="M280 125v110l95-55z" fill="#ad8121"/></svg>');
const queue=[];let running=0;
function capture(image){return new Promise(resolve=>{
 const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='metadata';video.crossOrigin='anonymous';let finished=false;
 const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);video.pause();video.removeAttribute('src');video.load();resolve()};
 const timer=setTimeout(finish,7000);video.onerror=finish;
 video.onloadedmetadata=()=>{try{video.currentTime=Math.min(1,Math.max(0,(video.duration||1)-.1))}catch{finish()}};
 video.onseeked=()=>{try{const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;canvas.getContext('2d').drawImage(video,0,0,480,270);image.src=canvas.toDataURL('image/jpeg',.8)}catch{}finish()};
 video.src=image.dataset.localVideo;
});}
function drain(){while(running<2&&queue.length){const image=queue.shift();running++;capture(image).finally(()=>{running--;drain()});}}
for(const image of document.querySelectorAll('.story-card img')){
 const fail=()=>{if(image.dataset.previewFailed)return;image.dataset.previewFailed='1';image.src=fallback;if(image.dataset.localVideo){queue.push(image);drain()}else if(image.dataset.vimeoUrl){const endpoint=new URL('https://vimeo.com/api/oembed.json');endpoint.searchParams.set('url',image.dataset.vimeoUrl);endpoint.searchParams.set('width','640');fetch(endpoint,{credentials:'omit',signal:AbortSignal.timeout(6000)}).then(response=>response.ok?response.json():Promise.reject()).then(data=>{const cover=new URL(data.thumbnail_url);if(cover.protocol==='https:'&&!cover.username&&!cover.password&&(cover.hostname==='vimeocdn.com'||cover.hostname.endsWith('.vimeocdn.com')))image.src=cover.href}).catch(()=>{});}};
 image.addEventListener('error',fail);if(image.complete&&image.naturalWidth===0)fail();
}
