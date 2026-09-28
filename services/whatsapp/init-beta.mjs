import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync,existsSync,chmodSync} from 'node:fs';
import path from 'node:path';
const directory=path.join(import.meta.dirname,'data');
mkdirSync(directory,{recursive:true,mode:0o700});
const target=path.join(directory,'bridge-secret');
if(!existsSync(target))writeFileSync(target,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
chmodSync(target,0o600);
console.log('Beta secret ready; value was not printed.');
