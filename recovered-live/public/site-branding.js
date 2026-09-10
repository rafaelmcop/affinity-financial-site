(() => {
  if(window.affinitySiteBrandingLoaded)return;window.affinitySiteBrandingLoaded=true;
  let revision='';try{revision=localStorage.getItem('affinitySiteBrandRevision')||'';}catch{}
  fetch('/api/site-branding'+(revision?'?v='+encodeURIComponent(revision):'')).then(r=>r.ok?r.json():null).then(data=>{
    const logo=data?.images?.logo;if(!logo||!/^\/site-brand\/image\/logo\?v=[a-f0-9-]+$/.test(logo))return;
    const style=document.createElement('style');
    style.textContent=`.affinity-company-mark::before{content:'';display:block;width:160px;max-width:100%;height:48px;background:url("${logo}") left center/contain no-repeat;margin-bottom:4px}@media(max-width:600px){.affinity-company-mark::before{width:125px;height:36px}}`;
    document.head.append(style);
    let pending=false;
    const mark=()=>{pending=false;for(const el of document.querySelectorAll('a,button,h1,h2,h3,div,p,span')){
      // Mark only the leaf company label. Never replace text nodes managed by React.
      if(el.childElementCount===0&&/^Affinity Financial(?: Consulting(?: Inc\.?)?)?$/.test(el.textContent.trim())&&(el.closest('header,footer,nav,aside,button,.side,.brand,.agent-menu-head,[class*="sidebar"]')||/^H[123]$/.test(el.tagName)))el.classList.add('affinity-company-mark');
    }};
    mark();new MutationObserver(records=>{if(!pending&&records.some(r=>r.addedNodes.length)){pending=true;requestAnimationFrame(mark);}}).observe(document.body,{childList:true,subtree:true});
  }).catch(()=>{});
})();
