// Booking windows: the moment a booking opens, for the things that sell out in minutes — a
// Disney restaurant a month ahead at ten in the morning, the Pokémon Café thirty-one days ahead
// at six in the evening, Ghibli on the tenth of the month before. Each is a time in Japan, said
// in home time too, because the alarm is set by somebody sitting in Sydney. The plan suggests the
// ones it can see coming from its own stops; anything else a parent adds by hand. Windows change
// without notice, so every suggestion says where to check it, and when two sources disagree the
// earlier reminder is the one used: being early costs a wasted look, being late costs the booking.
import {entryType} from './entry-types.js';
import {japanDate} from './timing.js';
export const HOME_ZONE='Australia/Sydney',HOME_LABEL='Sydney';
const pad=n=>String(n).padStart(2,'0');
const shiftDays=(date,n)=>{const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10);};
const monthsBefore=(date,n,day=null)=>{
 const [y,m,d]=date.split('-').map(Number),t=new Date(Date.UTC(y,m-1-n,1));
 const last=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate();
 // "A month before" a date the earlier month does not have is the 1st of the month after it,
 // as Tokyo Disney's own example has it: a stay on 31 October opens on 1 July.
 const want=day??d;
 if(want>last){const n=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,1));return `${n.getUTCFullYear()}-${pad(n.getUTCMonth()+1)}-01`;}
 return `${t.getUTCFullYear()}-${pad(t.getUTCMonth()+1)}-${pad(want)}`;
};
// When a rule opens for a visit on `date`, as an instant (ISO, UTC), read in Japan time.
export function opensFor(rule,date){
 const day=rule.kind==='days'?shiftDays(date,rule.days):rule.kind==='months'?monthsBefore(date,rule.months):monthsBefore(date,rule.months||1,rule.day);
 return new Date(`${day}T${rule.time}:00+09:00`).toISOString();
}
export const RULES=[
 {id:'disney-dining',label:'Tokyo Disney restaurant (Priority Seating)',kind:'months',months:1,time:'10:00',url:'https://www.tokyodisneyresort.jp/en/tdr/guide/app_service/priorityseating.html',
  says:'One month before, from 10:00 Japan time, in the Tokyo Disney Resort app or website.',
  match:(s,d)=>/disney/i.test(d.city||'')&&entryType(s).id==='food'&&/lunch|dinner|restaurant|dining|chef mickey/i.test(s.title)&&!/\b(buy|leave|packing|hilton|hotel)\b/i.test(s.title)},
 {id:'disney-hotel',label:'Disney Hotel room',kind:'months',months:4,time:'11:00',url:'https://www.tokyodisneyresort.jp/en/hotel/topics/info/operation/reservation.html',
  says:'Four months before the night, from 11:00 Japan time.',
  match:s=>/(fantasy springs|disney.*hotel|toy story hotel|miracosta|ambassador).*(check-in|check in)|(check-in|check in).*(fantasy springs|disney)/i.test(s.title)},
 {id:'disney-tickets',label:'Tokyo Disney park tickets',kind:'days',days:60,time:'14:00',url:'https://www.tokyodisneyresort.jp/en/ticket/index.html',
  says:'About two months (60 days) before, from 14:00 Japan time.',perDay:true,
  matchDay:d=>/disneyland|disneysea/i.test(d.city||'')},
 {id:'pokemon-cafe',label:'Pokémon Café',kind:'days',days:31,time:'18:00',url:'https://reserve.pokemon-cafe.jp/',
  says:'31 days before, from 18:00 Japan time. Weekend slots go in minutes.',match:s=>/pok[eé]mon caf[eé]/i.test(`${s.title} ${s.place||''}`)},
 {id:'ghibli',label:'Ghibli Museum',kind:'monthDay',months:1,day:10,time:'10:00',url:'https://www.ghibli-museum.jp/en/tickets/',
  says:'On the 10th of the month before, from 10:00 Japan time, through Lawson Ticket.',match:s=>/ghibli museum/i.test(`${s.title} ${s.place||''}`)},
 {id:'shibuya-sky',label:'SHIBUYA SKY',kind:'days',days:28,time:'00:00',url:'https://www.shibuya-scramble-square.com/sky/ticket/',
  says:'Sources say 4 weeks or 2 weeks before, at midnight Japan time, so this reminds at 4 weeks.',match:s=>/shibuya sky/i.test(s.title)},
 {id:'shinkansen',label:'Shinkansen seats',kind:'months',months:1,time:'10:00',url:'https://smart-ex.jp/en/',
  says:'Seats are confirmed one month before (smartEX takes requests up to a year ahead).',match:s=>/nozomi|shinkansen|hikari/i.test(s.title)}
];
export const findRule=id=>RULES.find(r=>r.id===id)||null;
export const windows=state=>[...(state.bookingWindows||[])].sort((a,b)=>String(a.opensAt).localeCompare(String(b.opensAt)));
// What the plan can see coming, less what has already been added.
export function suggestedWindows(state){
 const have=new Set((state.bookingWindows||[]).map(w=>w.key).filter(Boolean)),out=[];
 for(const d of state.days||[])for(const r of RULES){
  if(r.perDay){if(r.matchDay(d))out.push({key:`${r.id}|${d.date}`,ruleId:r.id,title:`${r.label} for ${d.title||d.date}`,day:d.date,stepId:null,opensAt:opensFor(r,d.date),url:r.url,notes:r.says});continue;}
  for(const s of (state.steps||[]).filter(s=>s.day===d.date&&s.status!=='skipped'&&r.match(s,d)))
   out.push({key:`${r.id}|${s.id}`,ruleId:r.id,title:`${r.label}: ${s.title}`,day:d.date,stepId:s.id,opensAt:opensFor(r,d.date),url:r.url,notes:r.says});
 }
 return out.filter(w=>!have.has(w.key)).sort((a,b)=>a.opensAt.localeCompare(b.opensAt));
}
// Where a window stands at `now`: still to open (and how long), open and not booked, or done.
export function windowState(w,now=new Date()){
 if(w.bookedAt)return {kind:'booked'};
 const ms=Date.parse(w.opensAt)-now;
 return ms>0?{kind:'soon',ms,days:Math.floor(ms/86400000)}:{kind:'open',ms};
}
// The windows worth a line on Home: opening within the fortnight, or open and still not booked.
// One whose day has already gone is no longer anything to book.
export const upcomingWindows=(state,now=new Date(),within=14)=>windows(state).filter(w=>{if(w.day&&w.day<japanDate(now))return false;const s=windowState(w,now);return s.kind==='open'||(s.kind==='soon'&&s.ms<=within*86400000);});
export const inZone=(iso,zone,opts={weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})=>new Intl.DateTimeFormat('en-AU',{...opts,timeZone:zone}).format(new Date(iso));
export const untilWords=ms=>{const m=Math.max(0,Math.round(ms/60000)),d=Math.floor(m/1440),h=Math.floor(m%1440/60);return d>1?`${d} days`:d===1?`1 day ${h} hr`:h?`${h} hr ${m%60} min`:`${m} min`;};
