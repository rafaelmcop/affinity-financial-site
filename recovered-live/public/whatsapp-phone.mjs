export const countries=[['US','1','🇺🇸 EUA'],['BR','55','🇧🇷 Brasil'],['CA','1','🇨🇦 Canadá'],['MX','52','🇲🇽 México'],['PT','351','🇵🇹 Portugal'],['ES','34','🇪🇸 Espanha'],['GB','44','🇬🇧 Reino Unido'],['CO','57','🇨🇴 Colômbia'],['AR','54','🇦🇷 Argentina'],['PE','51','🇵🇪 Peru'],['EC','593','🇪🇨 Equador'],['VE','58','🇻🇪 Venezuela'],['DO','1','🇩🇴 República Dominicana']];
export function phoneNumber(value,country='US'){
 const raw=String(value||'').trim(),digits=raw.replace(/\D/g,''),code=countries.find(c=>c[0]===country)?.[1]||'1';
 if(!digits)return '';
 let number;
 if(raw.startsWith('+'))number=digits;
 else if(raw.startsWith('00'))number=digits.slice(2);
 else if(code==='1')number=digits.length===10?'1'+digits:digits.length===11&&digits.startsWith('1')?digits:'';
 else if(digits.startsWith(code)&&digits.length>11)number=digits;
 else number=code+digits.replace(/^0/,'');
 return /^[1-9]\d{7,14}$/.test(number)?number:'';
}
export function savedPhone(value){
 const raw=String(value||'').trim(),digits=raw.replace(/\D/g,'');
 return raw.startsWith('+')||raw.startsWith('00')?phoneNumber(raw):digits.length===10?'1'+digits:/^[1-9]\d{7,14}$/.test(digits)?digits:'';
}
export function matchContact(contacts,number){
 const matches=contacts.filter(c=>[c.phone,c.whatsapp].some(p=>savedPhone(p)===number));
 return matches.length===1?matches[0]:null;
}
