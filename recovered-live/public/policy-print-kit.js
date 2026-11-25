export function requiredClientName(value){
 const name=String(value||'').normalize('NFC').replace(/\s+/g,' ').trim();
 if(name.length<2||name.length>100||!/[A-Za-zÀ-ÿ]/.test(name))throw Error('Informe o nome do cliente, com 2 a 100 caracteres, antes de gerar os documentos.');
 if(/[^\x20-\x7e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2026]/.test(name))throw Error('O nome contém caracteres não suportados na impressão. Revise o nome do cliente.');
 return name;
}
export async function makeThankYouLetter(templateBytes,clientName,fontBytes,fontkit){
 const name=requiredClientName(clientName),pdf=globalThis.PDFLib;
 if(!fontkit)throw Error('Não foi possível preparar a fonte da carta. Tente novamente.');
 const doc=await pdf.PDFDocument.load(templateBytes,{updateMetadata:false});doc.registerFontkit(fontkit);
 if(doc.getPageCount()!==1)throw Error('O modelo da carta precisa ter uma página.');
 const page=doc.getPage(0),size=page.getSize();if(size.width!==612||size.height!==792)throw Error('O modelo da carta mudou de tamanho.');
 const font=await doc.embedFont(fontBytes,{subset:true}),text=name+',',lines=[];let current='',first=true;
 for(const word of text.split(' ')){
  const max=first?381:443.4;
  if(current&&font.widthOfTextAtSize(current+' '+word,10)*1.2>max){lines.push(current);current='';first=false;}
  for(const char of (current?' ':'')+word){const capacity=first?381:443.4;if(current&&font.widthOfTextAtSize(current+char,10)*1.2>capacity){lines.push(current);current='';first=false;}current+=char;}
 }
 if(current)lines.push(current);if(lines.length>3)throw Error('O nome ficou muito longo para o espaço da carta. Revise o nome.');
 // Preserve the original PDF page; only replace its salutation comma and
 // add the name in the empty greeting area. The body and signature never move.
 page.drawRectangle({x:151.05,y:604,width:4.2,height:13.5,color:pdf.rgb(1,1,1)});
 for(let index=0;index<lines.length;index++){
  const x=index===0?154.5:92.6;
  page.pushOperators(pdf.pushGraphicsState(),pdf.concatTransformationMatrix(1.2,0,0,1,0,0));
  page.drawText(lines[index],{x:x/1.2,y:607.55-index*13,size:10,font,color:pdf.rgb(0,0,0)});
  page.pushOperators(pdf.popGraphicsState());
 }
 doc.catalog.getOrCreateViewerPreferences().setPrintScaling(pdf.PrintScaling.None);
 return doc.save();
}
let fontkitLoading;
export async function loadLetterFontkit(){
 if(globalThis.fontkit)return globalThis.fontkit;
 if(!fontkitLoading)fontkitLoading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/fontkit.umd.min.js';script.onload=()=>globalThis.fontkit?resolve(globalThis.fontkit):reject(Error('Fonte da carta indisponível.'));script.onerror=()=>reject(Error('Não foi possível carregar a fonte da carta.'));document.head.append(script);}).catch(error=>{fontkitLoading=null;throw error;});
 return fontkitLoading;
}
