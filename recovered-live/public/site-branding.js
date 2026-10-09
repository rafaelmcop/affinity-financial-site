(() => {
  if(window.affinitySiteBrandingLoaded)return;window.affinitySiteBrandingLoaded=true;
  let revision='';try{revision=localStorage.getItem('affinitySiteBrandRevision')||'';}catch{}
  fetch('/api/site-branding'+(revision?'?v='+encodeURIComponent(revision):'')).then(r=>r.ok?r.json():null).then(async data=>{
    const logo=data?.images?.logo;if(!logo||!/^\/site-brand\/image\/logo\?v=[a-f0-9-]+$/.test(logo))return;
    let displayLogo=logo;try{displayLogo=await window.affinityFitLogo(logo);}catch{}
    const scale=Number.isInteger(data.logoScale)&&data.logoScale>=50&&data.logoScale<=300?data.logoScale/100:1;
    const style=document.createElement('style');
    style.textContent=`.affinity-company-caption{display:none!important}.affinity-logo-row{height:auto!important;min-height:64px;padding-top:8px;padding-bottom:8px}.affinity-company-mark{font-size:0!important;line-height:0!important}.affinity-company-mark::before{content:'';display:block;width:${160*scale}px;max-width:min(100%,80vw);height:${48*scale}px;background:url("${displayLogo}") left center/contain no-repeat;margin-bottom:0}@media(max-width:600px){.affinity-company-mark{font-size:0!important;line-height:0!important}.affinity-company-mark::before{width:${125*scale}px;height:${36*scale}px}}`;
    document.head.append(style);
    let pending=false;
    const mark=()=>{pending=false;for(const el of document.querySelectorAll('a,button,h1,h2,h3,div,p,span')){
      // Mark only the leaf company label. Never replace text nodes managed by React.
      if(el.childElementCount===0&&/^Affinity Financial(?: Consulting(?: Inc\.?)?)?$/.test(el.textContent.trim())&&(el.closest('header,footer,nav,aside,button,.side,.brand,.agent-menu-head,[class*="sidebar"]')||/^H[123]$/.test(el.tagName))){el.classList.add('affinity-company-mark');if(el.tagName==='DIV')for(const sibling of el.parentElement.children)if(sibling!==el&&/^Consulting Inc\.?$/.test(sibling.textContent.trim()))sibling.classList.add('affinity-company-caption');const row=el.closest('.h-16');if(row)row.classList.add('affinity-logo-row');}
    }};
    mark();new MutationObserver(records=>{if(!pending&&records.some(r=>r.addedNodes.length)){pending=true;requestAnimationFrame(mark);}}).observe(document.body,{childList:true,subtree:true});
  }).catch(()=>{});
})();
