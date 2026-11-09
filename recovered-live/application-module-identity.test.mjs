import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
test('application root and lazy-loaded pages share the same core module URL and React context',async()=>{
 const html=await readFile(new URL('./public/index.html',import.meta.url),'utf8');
 const entry=html.match(/src="([^" ]*index-BIU-6RMI\.js[^" ]*)"/)[1],root=new URL(entry,'https://www.affinityfc.org').href;
 const dir=new URL('./public/assets/',import.meta.url);let compared=0;
 for(const file of await readdir(dir)){if(!file.endsWith('.js')||file==='index-BIU-6RMI.js')continue;const source=await readFile(new URL(file,dir),'utf8');for(const match of source.matchAll(/from\s*["']([^"']*index-BIU-6RMI\.js[^"']*)["']/g)){assert.equal(new URL(match[1],'https://www.affinityfc.org/assets/'+file).href,root,file+' must reuse the core module already loaded by index.html');compared++;}}
 assert(compared>10);
});
