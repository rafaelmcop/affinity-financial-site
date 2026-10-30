(() => {
 const status=document.querySelector('#status');
 async function start(){
  const response=await fetch('/api/site-branding',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível carregar as imagens atuais.');
  const {images,logoScale=100}=await response.json();
  for(const [slot,label] of [['logo','Logo institucional'],['hero','Imagem principal'],['about','Imagem da seção Sobre']]){
   const section=document.createElement('section'),h=document.createElement('h2'),img=document.createElement('img'),input=document.createElement('input'),save=document.createElement('button'),reset=document.createElement('button'),hint=document.createElement('small'),preview=document.createElement('div'),fallback=document.createElement('strong');
   h.textContent=label;preview.className='preview';img.alt=label;img.hidden=!images[slot];if(images[slot])img.src=slot==='logo'?await window.affinityFitLogo(images[slot]).catch(()=>images[slot]):images[slot];fallback.textContent='Affinity Financial';fallback.hidden=!!images[slot];input.type='file';input.accept='image/png,image/jpeg';input.setAttribute('aria-label',label);save.textContent='Salvar '+label.toLowerCase();save.disabled=true;reset.textContent='Restaurar padrão original';reset.className='secondary';reset.disabled=!images[slot]||(slot!=='logo'&&!images[slot].startsWith('/site-brand/'));hint.textContent=slot==='logo'?'O logo substitui o nome em texto. Ajuste o tamanho e confira a prévia antes de salvar.':'Use preferencialmente uma imagem horizontal.';
   let data,sequence=0,custom=!!images[slot]&&(slot==='logo'||images[slot].startsWith('/site-brand/')),sizeChanged=false;
   const sizeLabel=document.createElement('label'),slider=document.createElement('input'),sizeOutput=document.createElement('output');
   sizeLabel.textContent='Tamanho do logo';slider.type='range';slider.min='50';slider.max='300';slider.step='10';slider.value=String(logoScale);slider.setAttribute('aria-label','Tamanho do logo');sizeOutput.textContent=slider.value+'%';
   function updatePreview(){if(slot!=='logo')return;const factor=Number(slider.value)/100;img.style.width=(160*factor)+'px';img.style.height=(48*factor)+'px';sizeOutput.textContent=slider.value+'%';}
   updatePreview();slider.disabled=!custom;slider.oninput=()=>{sizeChanged=true;updatePreview();save.disabled=!custom&&!data;status.textContent='Confira o tamanho na prévia e clique em Salvar logo institucional.';};
   input.onchange=async()=>{const current=++sequence;save.disabled=true;data=null;try{
    const file=input.files[0];if(!file){save.disabled=!sizeChanged||!custom;return;}if(!['image/png','image/jpeg'].includes(file.type)||file.size>20*1024*1024)throw Error('Escolha PNG ou JPG de até 20 MB.');
    const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');let width=Math.min(slot==='logo'?900:1920,bitmap.width),encoded;
    for(let i=0;i<8;i++){canvas.width=Math.max(1,Math.round(width));canvas.height=Math.max(1,Math.round(bitmap.height*canvas.width/bitmap.width));const ctx=canvas.getContext('2d');if(slot!=='logo'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);encoded=canvas.toDataURL(slot==='logo'?'image/png':'image/jpeg',.82);if(encoded.split(',')[1].length<1066000)break;width*=.75;}bitmap.close();
    if(current!==sequence)return;if(encoded.split(',')[1].length>=1066000)throw Error('Não foi possível otimizar esta imagem. Escolha um arquivo menor.');
    data=encoded.split(',')[1];img.src=slot==='logo'?await window.affinityFitLogo(encoded):encoded;img.hidden=false;fallback.hidden=true;slider.disabled=false;updatePreview();save.disabled=false;reset.disabled=false;status.textContent='Prévia pronta. Clique em salvar para aplicar a alteração.';
   }catch(error){if(current===sequence)status.textContent=error.message;}};
   async function apply(action){
    const controls=[save,input,reset,slider];controls.forEach(el=>el.disabled=true);
    try{
     const res=await fetch('/api/admin/site-branding',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slot,action,data:action==='upload'?data:undefined,scale:slot==='logo'?Number(slider.value):100})});
     const result=await res.json();if(!res.ok)throw Error(result.error||'Não foi possível salvar.');
     if(action==='reset'){custom=false;img.hidden=!result.url;if(result.url)img.src=result.url;else img.removeAttribute('src');fallback.hidden=!!result.url;slider.value='100';updatePreview();status.textContent='Padrão original restaurado. Atualize o site para conferir.';}
     else{custom=true;if(result.url)img.src=slot==='logo'?await window.affinityFitLogo(result.url).catch(()=>result.url):result.url;status.textContent='Alteração salva com sucesso. Atualize o site para conferir.';}
     data=null;sizeChanged=false;sequence++;input.value='';try{localStorage.setItem('affinitySiteBrandRevision',String(Date.now()));}catch{}
    }catch(error){status.textContent=error.message;}
    finally{input.disabled=false;slider.disabled=!custom&&!data;reset.disabled=!custom&&!data;save.disabled=!data&&!(sizeChanged&&custom);}
   }
   save.onclick=()=>{if(!data&&!(slot==='logo'&&custom&&sizeChanged))return;void apply(data?'upload':'resize');};
   reset.onclick=()=>{if(!confirm('Remover a personalização e voltar ao padrão original de '+label.toLowerCase()+'?'))return;void apply('reset');};
   preview.append(img,fallback);section.append(h,preview,hint,input);if(slot==='logo'){const sizing=document.createElement('div');sizing.className='sizing';sizing.append(sizeLabel,slider,sizeOutput);section.append(sizing);}const actions=document.createElement('div');actions.className='actions';actions.append(save,reset);section.append(actions);document.querySelector('#images').append(section);
  }status.textContent='Selecione uma imagem ou ajuste o tamanho do logo atual.';
 }
 start().catch(error=>{status.textContent=error.message;});
})();
