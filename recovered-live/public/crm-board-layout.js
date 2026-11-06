export function mountBoardLayout(board){
 const controls=document.createElement('div');controls.className='board-layout-controls';
 const label=document.createElement('label');label.textContent='Largura das colunas';const input=document.createElement('input');input.type='range';input.min='220';input.max='420';input.step='10';input.value='280';input.setAttribute('aria-label','Largura das colunas');
 try{const saved=Number(localStorage.getItem('affinity-crm-column-width'));if(saved>=220&&saved<=420)input.value=String(saved);}catch{}
 const output=document.createElement('output');label.append(input,output);controls.append(label);
 const scroll=document.createElement('div');scroll.className='board-horizontal-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Rolar as colunas do funil horizontalmente');const spacer=document.createElement('div');scroll.append(spacer);
 board.before(controls,scroll);board.tabIndex=0;
 const syncSize=()=>{const width=board.scrollWidth+'px';if(spacer.style.width!==width)spacer.style.width=width;scroll.hidden=board.scrollWidth<=board.clientWidth||board.classList.contains('crm-list-view');scroll.scrollLeft=board.scrollLeft;};
 const apply=()=>{board.style.setProperty('--board-column-width',input.value+'px');output.textContent=input.value+' px';requestAnimationFrame(syncSize);};
 input.oninput=()=>{apply();try{localStorage.setItem('affinity-crm-column-width',input.value);}catch{}};
 scroll.addEventListener('scroll',()=>{if(Math.abs(board.scrollLeft-scroll.scrollLeft)>1)board.scrollLeft=scroll.scrollLeft;});board.addEventListener('scroll',()=>{if(Math.abs(scroll.scrollLeft-board.scrollLeft)>1)scroll.scrollLeft=board.scrollLeft;});
 new ResizeObserver(syncSize).observe(board);new MutationObserver(()=>requestAnimationFrame(syncSize)).observe(board,{childList:true,attributes:true,attributeFilter:['class']});apply();
}
