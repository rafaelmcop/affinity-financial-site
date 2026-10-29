import {readFile,writeFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import puppeteer from '../../services/whatsapp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
const dir=fileURLToPath(new URL('./',import.meta.url)),repo=fileURLToPath(new URL('../../',import.meta.url)),assets=dir+'assets/';await mkdir(assets,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.AFFINITY_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{const page=await browser.newPage(),svg=await readFile(dir+'icon.svg','utf8');for(const size of [16,32,48,128]){await page.setViewport({width:size,height:size,deviceScaleFactor:1});await page.setContent('<style>html,body{margin:0;background:transparent;width:100%;height:100%}svg{display:block;width:100%;height:100%}</style>'+svg);await page.screenshot({path:assets+'icon'+size+'.png',omitBackground:true});}
await page.setViewport({width:1280,height:800,deviceScaleFactor:1});let consent=(await readFile(dir+'consent.html','utf8')).replace('<script src="consent.js"></script>','').replace('src="assets/icon128.png"','src="data:image/png;base64,'+(await readFile(assets+'icon128.png')).toString('base64')+'"');await page.setContent(consent);await page.screenshot({path:assets+'screenshot-data-access.png'});
let sync=(await readFile(repo+'recovered-live/public/agent-five-rings-sync.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('<link rel="stylesheet" href="/staff-flow.css">','<style>'+await readFile(repo+'recovered-live/public/staff-flow.css','utf8')+'</style>');await page.setContent(sync);await page.evaluate(()=>{document.getElementById('browser-status').textContent='DEMONSTRATION · Reading detailed records: 18 of 60. No customer data is shown.';document.getElementById('status').textContent='The authorized user can keep working in the Affinity portal.';document.getElementById('browser-confirm').checked=true;});await page.screenshot({path:assets+'screenshot-progress.png'});
}finally{await browser.close()}
// This independent store package adds consent and icons without changing the
// existing unpacked development connector or its current four-file installation.
execFileSync('/usr/bin/python3',['-c',String.raw`
from pathlib import Path
import json,zipfile,sys
repo=Path(sys.argv[1]);store=repo/'integrations/five-rings-store';source=repo/'integrations/five-rings-browser'
manifest=json.loads((source/'manifest.json').read_text());manifest.update(name='Affinity Five Rings Connector',description='Sync authorized Five Rings client, policy and credit records with your Affinity agent portal using your own browser session.',minimum_chrome_version='112',icons={str(s):'assets/icon'+str(s)+'.png' for s in [16,32,48,128]},action={'default_title':'Affinity Five Rings Connector','default_popup':'consent.html'},homepage_url='https://www.affinityfc.org/five-rings-privacy.html')
assert len(manifest['description'])<=132
background=(source/'background.js').read_text();needle='  for(const [id,job]of jobs)';assert needle in background;background=background.replace(needle,"  if(['collectStart','backgroundStart'].includes(message.action))await requireStoreConsent();\n"+needle);background="importScripts('store-setup.js');\n"+background
files={'manifest.json':json.dumps(manifest,indent=2).encode(),'background.js':background.encode(),**{n:(source/n).read_bytes() for n in ['affinity.js','five-rings.js']},**{n:(store/n).read_bytes() for n in ['consent.html','consent.js','store-setup.js']},**{'assets/icon'+str(s)+'.png':(store/'assets'/('icon'+str(s)+'.png')).read_bytes() for s in [16,32,48,128]}}
with zipfile.ZipFile(repo/'recovered-live/public/affinity-five-rings-webstore.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
 for name,data in files.items():
  info=zipfile.ZipInfo(name,date_time=(2026,10,29,12,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,data)
print('Store ZIP prepared; version '+manifest['version']+'; includes explicit data-access controls.')
`,repo]);
