export function mountBoardLayout(board){
 const controls=document.createElement('div');controls.className='board-layout-controls';
 const label=document.createElement('label');label.textContent='Percorrer colunas';label.htmlFor='board-scroll-position';
 const previous=document.createElement('button'),next=document.createElement('button');previous.type=next.type='button';previous.textContent='←';next.textContent='→';previous.setAttribute('aria-label','Ver colunas anteriores');next.setAttribute('aria-label','Ver próximas colunas');
 const input=document.createElement('input');input.id='board-scroll-position';input.type='range';input.min='0';input.max='0';input.step='1';input.value='0';input.setAttribute('aria-label','Percorrer colunas do funil');
 controls.append(label,previous,input,next);board.before(controls);board.tabIndex=0;
 const syncPosition=()=>{input.value=String(board.scrollLeft);previous.disabled=board.scrollLeft<=1;next.disabled=board.scrollLeft>=Number(input.max)-1;};
 const syncSize=()=>{if(controls.nextElementSibling!==board)board.before(controls);input.max=String(Math.max(0,board.scrollWidth-board.clientWidth));input.disabled=Number(input.max)===0;controls.hidden=Number(input.max)===0;syncPosition();};
 input.oninput=()=>{board.scrollLeft=Number(input.value);syncPosition();};
 previous.onclick=()=>{board.scrollLeft-=Math.max(280,board.clientWidth*.8);syncPosition();};next.onclick=()=>{board.scrollLeft+=Math.max(280,board.clientWidth*.8);syncPosition();};
 board.addEventListener('scroll',syncPosition);new ResizeObserver(syncSize).observe(board);new MutationObserver(()=>requestAnimationFrame(syncSize)).observe(board,{childList:true,attributes:true,attributeFilter:['class']});new MutationObserver(()=>requestAnimationFrame(syncSize)).observe(board.parentElement,{childList:true});requestAnimationFrame(syncSize);
}
