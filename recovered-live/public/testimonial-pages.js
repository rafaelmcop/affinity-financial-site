const share=document.querySelector('[data-share]');
share?.addEventListener('click',async()=>{const status=document.querySelector('[data-share-status]');try{await navigator.clipboard.writeText(document.querySelector('link[rel=canonical]').href);status.textContent=share.dataset.copied;}catch{status.textContent=share.dataset.error;}});
for(const video of document.querySelectorAll('video'))video.addEventListener('error',()=>{document.querySelector('.player-error')?.removeAttribute('hidden');});
window.addEventListener('pagehide',()=>{for(const video of document.querySelectorAll('video')){video.pause();video.removeAttribute('src');video.load();}for(const frame of document.querySelectorAll('.focused-player iframe'))frame.remove();});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
