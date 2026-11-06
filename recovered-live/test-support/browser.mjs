import {existsSync} from 'node:fs';
import puppeteer from '../../services/whatsapp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';

// CI installs Puppeteer's matching Chrome. Local development may reuse the Mac runtime.
export function launchBrowser() {
  const localChrome = '/Users/minimac/Library/Application Support/AffinityWhatsApp/runtime/browser/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (!process.env.CI && existsSync(localChrome) ? localChrome : puppeteer.executablePath());
  return puppeteer.launch({executablePath, headless:true, pipe:true});
}
