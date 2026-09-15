(() => {
 const status=document.querySelector('#status');
 async function start(){
  const response=await fetch('/api/site-branding',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível carregar as imagens atuais.');
  const {images}=await response.json();
  for(const [slot,label] of [['logo','Logo institucional'],['hero','Imagem principal'],['about','Imagem da seção Sobre']]){
   const section=document.createElement('section'),h=document.createElement('h2'),img=document.createElement('img'),input=document.createElement('input'),save=document.createElement('button'),hint=document.createElement('small');
   h.textContent=label;img.alt=label;img.hidden=!images[slot];if(images[slot])img.src=images[slot];input.type='file';input.accept='image/png,image/jpeg';input.setAttribute('aria-label',label);save.textContent='Salvar '+label.toLowerCase();save.disabled=true;hint.textContent=slot==='logo'?'Um logo para todas as páginas e portais. PNG preserva a transparência.':'Use preferencialmente uma imagem horizontal.';
   let data,sequence=0;
   input.onchange=async()=>{const current=++sequence;save.disabled=true;data=null;try{
    const file=input.files[0];if(!file)return;if(!['image/png','image/jpeg'].includes(file.type)||file.size>20*1024*1024)throw Error('Escolha PNG ou JPG de até 20 MB.');
    const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');let width=Math.min(slot==='logo'?900:1920,bitmap.width),encoded;
    for(let i=0;i<8;i++){canvas.width=Math.max(1,Math.round(width));canvas.height=Math.max(1,Math.round(bitmap.height*canvas.width/bitmap.width));const ctx=canvas.getContext('2d');if(slot!=='logo'){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);encoded=canvas.toDataURL(slot==='logo'?'image/png':'image/jpeg',.82);if(encoded.split(',')[1].length<1066000)break;width*=.75;}bitmap.close();
    if(current!==sequence)return;if(encoded.split(',')[1].length>=1066000)throw Error('Não foi possível otimizar esta imagem. Escolha um arquivo menor.');
    data=encoded.split(',')[1];img.src=encoded;img.hidden=false;save.disabled=false;status.textContent='Prévia pronta. Clique em salvar para aplicar a alteração.';
   }catch(error){if(current===sequence)status.textContent=error.message;}};
   save.onclick=async()=>{if(!data)return;if(!confirm('Aplicar '+label.toLowerCase()+' ao site da Affinity?'))return;save.disabled=true;input.disabled=true;try{
    const res=await fetch('/api/admin/site-branding',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({slot,data})});
    const result=await res.json();if(!res.ok)throw Error(result.error||'Não foi possível salvar.');img.src=result.url;data=null;try{localStorage.setItem('affinitySiteBrandRevision',String(Date.now()));}catch{}status.textContent='Imagem salva com sucesso. Atualize o site para conferir.';
   }catch(error){status.textContent=error.message;save.disabled=false;}finally{input.disabled=false;}};
   section.append(h,img,hint,input,save);document.querySelector('#images').append(section);
  }status.textContent='Selecione a imagem que deseja trocar.';
 }
 start().catch(error=>{status.textContent=error.message;});
})();
