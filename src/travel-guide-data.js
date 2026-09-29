// The printed travel guide: the original 72-page guide taken apart and put back together from
// the plan as it stands, so an edited day prints as it now is rather than as it was designed.
// The original's structure is kept — a cover, where we are staying and the journey between,
// the trip at a glance, a chapter for each day (a banner, the plan at a glance, the numbered
// steps, a tip, the bookings and a sketch of where the stops are) and the pages to keep at the
// back — and its artwork is reused where it still belongs, cut from the original pages.
import {activeSteps,minutes,asClock} from './timing.js';
import {showLocationDetails} from './locations.js';
import {documentSteps,isArchived,photosFor} from './trip-features.js';
import {dayMap} from './day-map-data.js';
import {findPhrase} from './phrasebook-data.js';
import {EMERGENCY,CONSULAR} from './safety-data.js';

// Every original page is the same size, so a piece of one is described as fractions of it.
export const GUIDE_PAGE={w:1247,h:1800};
// The top of each day's first page is its banner photograph, the width of the page.
export const BANNER={x:0,y:0,w:1,h:.29};
// Where each hotel's photograph sits on the original 'Where we're staying' page. Reviewed by
// eye against page 13; a hotel not listed here prints without a picture rather than a wrong one.
export const HOTEL_ART={
 '1 Hotel Tokyo':{page:13,x:.031,y:.43,w:.454,h:.148},
 'Hotel Kanra Kyoto':{page:13,x:.514,y:.43,w:.454,h:.148},
 'Fantasy Springs Hotel':{page:13,x:.031,y:.722,w:.454,h:.148},
 'Hilton Tokyo':{page:13,x:.514,y:.708,w:.454,h:.163}
};
// A piece of an original page, as the printed page draws it: a frame of the right shape, with
// the whole page moved and scaled inside it so only that piece shows.
export function cropFrame({x,y,w,h}){
 return {ratio:(w*GUIDE_PAGE.w)/(h*GUIDE_PAGE.h),width:100/w,left:-100*x/w,top:-100*y/h};
}
// The six phrases the original's phrase page says to remember if nothing else.
export const SIX_PHRASES=['hello','thanks','excuse','please','howmuch','wheretoilet'];

const WEEKDAY=new Intl.DateTimeFormat('en-AU',{weekday:'long',timeZone:'UTC'});
const DAYMONTH=new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'long',timeZone:'UTC'});
const SHORT=new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
const at=date=>new Date(`${date}T00:00:00Z`);
export const longDate=date=>`${WEEKDAY.format(at(date))} ${DAYMONTH.format(at(date))}`;
export const shortDate=date=>SHORT.format(at(date)).replace(',','');
const nextDate=date=>new Date(at(date).getTime()+86400000).toISOString().slice(0,10);
const clip=(text,max)=>{
 const t=String(text||'').replace(/\s+/g,' ').trim();
 if(t.length<=max)return t;
 // Cut at a sentence where one ends close enough, otherwise at a word, never mid-word.
 const cut=t.slice(0,max),stop=cut.lastIndexOf('. ');
 return stop>max*.55?cut.slice(0,stop+1):cut.slice(0,cut.lastIndexOf(' ')).replace(/[,;:—-]$/,'')+'…';
};
// Getting to and from things is how a day moves, not what it is for, so it is left out of the
// line under the day's title and out of the tip.
const ROUTINE=/^(breakfast|leave|head to|walk to|return|back to|check[- ]?(in|out)|tickets?,|transfer|taxi|train to)\b/i;
const isFixed=s=>s.kind==='fixed'||s.locked||!!s.bookingTime;
const endOf=s=>s.time&&s.duration?asClock((minutes(s.time)+s.duration)%1440):null;

// The city a stay is in is the one most of its nights are in — the Hilton's first night follows a
// day at DisneySea, but it is a Tokyo hotel.
const mostOf=list=>{const n=new Map();for(const c of list.filter(Boolean))n.set(c,(n.get(c)||0)+1);return [...n].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';};
// The nights at each hotel, in order. A day's hotel is where that night is spent, except the last
// day of the trip, which is the day we leave.
export function stays(state){
 const days=state.days||[],out=[];
 days.forEach((d,i)=>{
  if(!d.hotel||i===days.length-1&&days.length>1)return;
  const last=out.at(-1);
  if(last&&last.hotel===d.hotel&&last.to===d.date){last.nights++;last.to=nextDate(d.date);last.cities.push(d.city);return;}
  out.push({hotel:d.hotel,from:d.date,to:nextDate(d.date),nights:1,cities:[d.city]});
 });
 return out.map((s,i)=>{
  const where=showLocationDetails(state,{place:s.hotel});
  return {n:i+1,hotel:s.hotel,from:s.from,to:s.to,nights:s.nights,city:mostOf(s.cities),
   japanese:where.japanese,address:where.address,japaneseAddress:where.japaneseAddress,art:HOTEL_ART[s.hotel]||null};
 });
}
// The plan at a glance: no more than five times, the ones a day is built around — its first
// stop, whatever is booked to a time, and its last — in the order they happen.
export function glance(steps,limit=5){
 const timed=steps.filter(s=>s.time);
 if(timed.length<=limit)return timed;
 const keep=new Set([timed[0],...timed.filter(isFixed),timed.at(-1)]);
 for(const s of timed){if(keep.size>=limit)break;if(s.kind!=='optional')keep.add(s);}
 return timed.filter(s=>keep.has(s)).slice(0,limit);
}
function dayChapter(state,d,i,{maps=true}={}){
 const steps=activeSteps(state,d.date).filter(s=>s.status!=='skipped');
 const ids=new Set(steps.map(s=>s.id));
 const bookings=(state.documents||[]).filter(doc=>!doc.parentDocumentId&&doc.category!=='memory'&&!isArchived(doc)&&documentSteps(doc).some(id=>ids.has(id)))
  .map(doc=>({id:doc.id,title:doc.title||'Booking',reference:doc.reference||'',person:doc.person||''}));
 const everyone=(state.members||[]).length;
 const items=steps.map((s,k)=>{
  const where=showLocationDetails(state,s);
  const who=(s.participants||[]).length&&(s.participants.length<everyone)?s.participants.join(' & '):'';
  return {n:k+1,id:s.id,time:s.time||'',until:endOf(s),title:s.title,place:s.place&&s.place!==s.title?s.place:'',
   japanese:where.japanese,kind:s.kind,fixed:isFixed(s),optional:s.kind==='optional',check:!!s.review||s.kind==='review',
   who,notes:clip(s.notes,220)};
 });
 const tipFrom=steps.filter(s=>s.notes&&!s.review&&s.kind!=='review'&&!ROUTINE.test(s.title)).sort((a,b)=>b.notes.length-a.notes.length)[0];
 const headline=steps.filter(s=>!ROUTINE.test(s.title)&&s.kind!=='optional'&&s.kind!=='review').slice(0,3).map(s=>s.title);
 const map=maps?dayMap(state,d.date):null;
 const photos=photosFor(state,d.date).slice(0,4).map(p=>p.id);
 return {date:d.date,number:i+1,title:d.title||`Day ${i+1}`,city:d.city||'',hotel:d.hotel||'',eyebrow:`${d.city||'Japan'} / ${longDate(d.date)}`.toUpperCase(),
  side:`${(d.city||'').split('/')[0].trim()} – ${shortDate(d.date)}`.toUpperCase(),
  lede:headline.join(' · '),glance:glance(steps).map(s=>({time:s.time,title:s.title,fixed:isFixed(s)})),items,
  tip:tipFrom?{about:tipFrom.title,text:clip(tipFrom.notes,300)}:null,bookings,
  banner:d.pages?.length?{page:d.pages[0],...BANNER}:null,pages:d.pages||[],photos,
  map:map&&map.marks.length>=2?map:null,
  moving:i>0&&state.days[i-1].hotel&&d.hotel&&state.days[i-1].hotel!==d.hotel};
}
// Which days go in. The whole trip, the days from today on, or one day.
export function guideDays(state,{range='all',day='',today=''}={}){
 const days=state.days||[];
 if(range==='day')return days.filter(d=>d.date===day);
 if(range==='ahead'&&today)return days.filter(d=>d.date>=today);
 return days;
}
export function travelGuide(state,{range='all',day='',today='',maps=true,printedOn=''}={}){
 const all=state.days||[],chosen=new Set(guideDays(state,{range,day,today}).map(d=>d.date));
 const nightsTotal=stays(state).reduce((a,s)=>a+s.nights,0);
 const legs=[];
 for(const s of stays(state)){const last=legs.at(-1);if(last&&last.city===s.city)last.to=s.to;else legs.push({city:s.city,from:s.from,to:s.to});}
 const chapters=all.map((d,i)=>chosen.has(d.date)?dayChapter(state,d,i,{maps}):null).filter(Boolean);
 return {
  title:state.tripName||'Japan',family:'The Pasfield family',printedOn,
  from:all[0]?.date||'',to:all.at(-1)?.date||'',days:all.length,nights:nightsTotal,
  whole:chapters.length===all.length,
  stays:stays(state),legs,
  summary:all.map((d,i)=>({date:d.date,number:i+1,title:d.title,city:d.city,hotel:d.hotel,
   fixed:activeSteps(state,d.date).filter(s=>isFixed(s)&&s.status!=='skipped').map(s=>({time:s.bookingTime||s.time||'',title:s.title}))})),
  checks:[...(state.notices||[]).map(n=>n.text),...(state.steps||[]).filter(s=>s.review&&s.status!=='done'&&chosen.has(s.day)).map(s=>`${shortDate(s.day)} · ${s.title}`)],
  phrases:SIX_PHRASES.map(findPhrase).filter(Boolean).map(p=>({en:p.en,ja:p.ja,say:p.say||p.romaji||''})),
  emergency:EMERGENCY.map(e=>({title:e.title,number:e.number})),
  consular:CONSULAR.map(c=>({title:c.title,number:c.number})),
  chapters
 };
}
