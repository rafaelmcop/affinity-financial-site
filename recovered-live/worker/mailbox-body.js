// Read MIME alternatives without dropping forwarded tables or loading remote content.
export function mailboxHtmlText(value){
 const entities={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",ndash:'–',mdash:'—',dollar:'$',colon:':',bull:'•',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“'};
 return String(value||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<[^>]*>/g,tag=>/^<br\b|^<\/(?:p|div|tr|table|li|h[1-6])\s*>/i.test(tag)?'\n':/^<\/(?:td|th)\s*>/i.test(tag)?'\t':'').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(all,key)=>{if(key[0]==='#'){const n=key[1]?.toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return entities[key.toLowerCase()]??all;}).replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function readableMailboxBody(parsed){
 const text=String(parsed?.text||parsed?.body||'').trim(),html=mailboxHtmlText(parsed?.html||parsed?.htmlBody);
 if(!html)return text.slice(0,50000);if(!text)return html.slice(0,50000);
 const compact=value=>value.replace(/\s+/g,'').toLowerCase();
 const existing=compact(text),facts=html.match(/\b(?:LS)?\d{7,12}\b|\$\s*[\d,]+(?:\.\d{1,2})?/gi)||[];
 // Financial details are often present only in the HTML alternative.
 return (facts.some(fact=>!existing.includes(compact(fact)))||html.length>text.length*1.1?html:text).slice(0,50000);
}
