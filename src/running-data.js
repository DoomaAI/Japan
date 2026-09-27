import {LINES,ROUTES} from './route-data.js';
// "Is everything running?" for one day: the service-status page of every operator whose line we
// ride that day, taken from the route cards, and flight status on a day with a flight. Links
// only — the operators publish no feed we can read — so the answer is one tap per company
// rather than a page of stops to open one at a time.
const FLIGHT=/\bflight to\b|\barrive at\b.*\b(haneda|narita|kansai|airport)\b|\bcheck-in and bag drop\b/i;
export function flightLinks(step){
 const text=`${step.title} ${step.place||''} ${step.notes||''}`;
 const links=[];
 if(/qantas|sydney|flight to/i.test(text))links.push(['Qantas flight status',`https://www.google.com/search?q=${encodeURIComponent(`Qantas flight status ${/sydney/i.test(text)?'Haneda to Sydney':''} ${step.day}`.replace(/\s+/g,' ').trim())}`]);
 if(/haneda/i.test(text))links.push(['Haneda Airport departures and arrivals','https://tokyo-haneda.com/en/']);
 return links;
}
export function runningToday(state,day){
 const steps=(state.steps||[]).filter(s=>s.day===day&&s.status!=='skipped');
 const byOperator=new Map();
 for(const s of steps)for(const leg of ROUTES[s.id]||[]){
  if(leg.mode!=='ride')continue;
  const line=LINES[leg.line];if(!line?.status)continue;
  const entry=byOperator.get(line.operator)||{operator:line.operator,status:line.status,lines:[]};
  if(!entry.lines.includes(line.name))entry.lines.push(line.name);
  byOperator.set(line.operator,entry);
 }
 const flights=steps.filter(s=>FLIGHT.test(s.title)).map(s=>({step:s,links:flightLinks(s)})).filter(f=>f.links.length);
 // One link per flight page, however many steps on the day mention the airport.
 const seen=new Set();
 for(const f of flights)f.links=f.links.filter(([,href])=>!seen.has(href)&&seen.add(href));
 return {operators:[...byOperator.values()],flights:flights.filter(f=>f.links.length)};
}
