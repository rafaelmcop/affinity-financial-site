// Fit the visible pixels for display; preserve the uploaded original on the server.
window.affinityFitLogo=async src=>{
 const image=new Image();image.src=src;await image.decode();
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 if(!canvas.width||!canvas.height||canvas.width*canvas.height>4000000)return src;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<left||bottom<top||left===0&&top===0&&right===canvas.width-1&&bottom===canvas.height-1)return src;
 const fitted=document.createElement('canvas');fitted.width=right-left+1;fitted.height=bottom-top+1;fitted.getContext('2d').drawImage(canvas,left,top,fitted.width,fitted.height,0,0,fitted.width,fitted.height);return fitted.toDataURL('image/png');
};
