(()=>{
 if(window.affinityAgentTheme)return;window.affinityAgentTheme=true;
 const root=document.documentElement;
 const apply=()=>{if(root.dataset.agentTheme!=='light')root.dataset.agentTheme='light';if(root.style.colorScheme!=='light')root.style.colorScheme='light';if(root.classList.contains('dark'))root.classList.remove('dark');document.getElementById('agent-appearance')?.remove();};
 try{localStorage.removeItem('theme');}catch{}
 apply();new MutationObserver(apply).observe(root,{attributes:true,attributeFilter:['class','data-agent-theme','style']});
 const clean=()=>document.getElementById('agent-appearance')?.remove();
 if(document.body)new MutationObserver(clean).observe(document.body,{childList:true,subtree:true});
})();
