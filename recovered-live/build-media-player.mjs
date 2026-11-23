// Keep the browser dependency local, pinned and reproducible; no CDN or second app.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
const source=new URL('./dependencies/node_modules/hls.js/',import.meta.url),target=new URL('./public/teste/tesla/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('package.json',source),'utf8'));if(manifest.version!=='1.7.4')throw Error('Unexpected HLS dependency version');
const code=(await readFile(new URL('dist/hls.min.mjs',source),'utf8')).replace(/^\/\/# sourceMappingURL=.*$/gm,'').trimEnd()+'\n';
await writeFile(new URL('hls-1.7.4.mjs',target),code);await copyFile(new URL('LICENSE',source),new URL('HLS-LICENSE.txt',target));
console.log('Affinity player built with local hls.js '+manifest.version);
