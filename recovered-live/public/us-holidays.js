// US federal calendar rules and observed dates: https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/
const source='https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/';
const date=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const nth=(y,m,weekday,n)=>1+(weekday-new Date(Date.UTC(y,m-1,1)).getUTCDay()+7)%7+(n-1)*7;
const last=(y,m,weekday)=>{const d=new Date(Date.UTC(y,m,0));return d.getUTCDate()-(d.getUTCDay()-weekday+7)%7;};
export function usHolidays(year){const items=[];for(const y of [year-1,year,year+1]){const holidays=[
[1,1,'Ano Novo','New Year’s Day celebra o início do ano civil.'],
[1,nth(y,1,1,3),'Martin Luther King Jr. Day','Homenagem à vida e ao legado de Martin Luther King Jr.'],
[2,nth(y,2,1,3),'Washington’s Birthday / Presidents’ Day','Feriado federal em homenagem a George Washington, também conhecido como Presidents’ Day.'],
[5,last(y,5,1),'Memorial Day','Dia de homenagem aos militares que morreram a serviço dos Estados Unidos.'],
[6,19,'Juneteenth','Comemora o fim da escravidão nos Estados Unidos.'],
[7,4,'Independence Day','Celebra a independência dos Estados Unidos, declarada em 4 de julho de 1776.'],
[9,nth(y,9,1,1),'Labor Day','Dia de reconhecimento às contribuições dos trabalhadores nos Estados Unidos.'],
[10,nth(y,10,1,2),'Columbus Day','Feriado federal que marca a chegada da expedição de Cristóvão Colombo às Américas.'],
[11,11,'Veterans Day','Homenagem aos veteranos das Forças Armadas dos Estados Unidos.'],
[11,nth(y,11,4,4),'Thanksgiving','Dia de Ação de Graças, celebrado na quarta quinta-feira de novembro.'],
[12,25,'Natal','Christmas Day, celebrado em 25 de dezembro.']
];for(const [month,day,title,description]of holidays){const actual=date(y,month,day),weekday=new Date(actual+'T12:00:00Z').getUTCDay();if(actual.startsWith(year+'-'))items.push({date:actual,title,description,source,informational:true});if(weekday===0||weekday===6){const observed=new Date(actual+'T12:00:00Z');observed.setUTCDate(observed.getUTCDate()+(weekday===0?1:-1));const when=observed.toISOString().slice(0,10);if(when.startsWith(year+'-'))items.push({date:when,title:title+' · observado',description:`Data de observância no calendário federal de ${title}. A data comemorativa é ${actual.slice(8)}/${actual.slice(5,7)}.`,source,informational:true});}}}return items.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));}
