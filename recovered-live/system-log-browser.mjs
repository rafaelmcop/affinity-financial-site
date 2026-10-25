import puppeteer from '../services/whatsapp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import fs from 'node:fs';import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.setContent(fs.readFileSync(new URL('./public/admin-system-logs.html',import.meta.url),'utf8').replace(/<script[^>]*src="\/admin-system-logs.js[^>]*><\/script>/,''));
 await page.evaluate(()=>{window.fetch=async()=>({ok:true,json:async()=>({result:{data:{json:[
  {owner:'server',event:'service',state:'error',httpStatus:503,path:'/api/example/old',createdAt:'2026-10-24 12:00:00',resolvedAt:'2026-10-24 12:01:00'},
  {owner:'server',event:'service',state:'error',httpStatus:503,path:'/api/example/current',createdAt:'2026-10-25 12:00:00',resolvedAt:null},
  {owner:'server',event:'service',state:'error',httpStatus:503,path:'/api/example/current',createdAt:'2026-10-25 11:59:00',resolvedAt:null}
 ]}}})});});
 await page.addScriptTag({path:new URL('./public/admin-system-logs.js',import.meta.url).pathname});
 await page.waitForFunction(()=>document.querySelector('#rows').textContent.includes('/api/example/current'));
 assert.equal((await page.$$('#rows tr')).length,1);
 await page.select('#log-scope','all');
 await page.waitForFunction(()=>document.querySelector('#rows').textContent.includes('Recuperada'));
 assert.equal((await page.$$('#rows tr')).length,3);
 assert((await page.$eval('#rows',e=>e.textContent)).includes('HTTP 503'));
 console.log('Browser check passed: pending failures deduplicated; recovered failures and original HTTP status preserved. No mail action used.');
}finally{await browser.close();}
