// What to wear today. One question everybody asks at the wardrobe, answered from what the app
// already knows: the forecast hour by hour across the hours we are actually out, how much walking
// the day holds, and the places that have rules about what you wear or take off. It says when the
// day turns warm or cool rather than giving one temperature, because a 16° start and a 27°
// afternoon is a jumper you will be carrying by eleven.
//
// Nothing here is looked up live. The dress rules are the ones that hold everywhere of their kind
// (shoes off on tatami, no swimwear in an onsen); anything a venue publishes for itself comes in
// as a "dress" note from the night-before check and is added at the end.
import {activeSteps,minutes} from './timing.js';
import {hoursFor,forecastFor,describe} from './weather-data.js';
import {routeFor} from './route-data.js';
import {entryType} from './entry-types.js';
import {personProfile} from './trip-features.js';
const clock=h=>`${String(h).padStart(2,'0')}:00`;
const text=s=>`${s.title} ${s.place||''}`;
// Rules that come with a kind of place. Each says what to wear or bring and why, in one line.
export const DRESS_RULES=[
 {id:'shoes-off',test:/\b(ryokan|tatami|zashiki|kaiseki|izakaya|temple hall|masu|box seats?)\b/i,
  text:'Shoes come off: slip-ons are quicker, and socks without holes.',icon:'🧦'},
 {id:'temple',test:/\b(temple|shrine|jingu|-ji\b|todai|kiyomizu|senso|meiji|fushimi inari|kinkaku|ginkaku|taisha)\b/i,
  text:'Temples and shrines: shoulders and knees covered is polite, hats off inside the halls, and shoes off wherever there is tatami.',icon:'⛩️'},
 {id:'steps',test:/\b(fushimi inari|kiyomizu|hike|trail|steps|mount|mt\.?|summit|bamboo grove)\b/i,
  text:'Stairs and slopes: trainers, not sandals or new shoes.',icon:'🥾'},
 {id:'onsen',test:/\b(onsen|sento|hot spring|bathhouse|public bath)\b/i,
  text:'Onsen: everyone bathes without swimwear; tattoos can be refused, so check first or cover them.',icon:'♨️'},
 {id:'water',test:/\bteamlab planets\b/i,
  text:'teamLab Planets: you wade through knee-deep water and walk on mirrors — shorts or trousers that roll above the knee, no skirts.',icon:'💧'},
 {id:'rooftop',test:/\b(shibuya sky|rooftop|observation deck|sky deck)\b/i,
  text:'Rooftop decks: hats and anything loose go in a locker, and it is windy and cooler up there.',icon:'🌬️'},
 {id:'park',test:/\b(disneyland|disneysea|disney resort|universal studios|nintendo world|usj|theme park)\b/i,
  text:'Theme park: costume rules apply (faces visible, no props or long trailing pieces) — check the park’s guidelines before dressing up.',icon:'🎢'},
 {id:'counter',test:/\b(omakase|sushi counter|kaiseki|fine dining|tasting menu)\b/i,
  text:'Counter or kaiseki dinner: no perfume or strong scent — it is rude to the food — and smart casual.',icon:'🍣'},
 {id:'deer',test:/\bnara\b.*\b(park|deer)\b|\bdeer\b/i,
  text:'Nara’s deer nibble paper, maps and dangling straps: nothing hanging off a bag.',icon:'🦌'},
 {id:'water-trip',test:/\b(river cruise|boat|ferry|water bus|bay cruise)\b/i,
  text:'On the water it is breezier and cooler than on the street: a layer for the boat.',icon:'⛴️'},
 {id:'night-game',test:/\b(tokyo dome|stadium|giants|baseball)\b/i,
  text:'A night game runs to about 21:30: a layer for the way home.',icon:'⚾'}
];
// The hours we are out: from the first stop to the end of the last, or 08:00–21:00 if the day
// has no times. Weather before breakfast and after bed is not anybody's problem.
export function outHours(steps){
 const timed=steps.filter(s=>s.time);
 if(!timed.length)return [8,21];
 const first=Math.min(...timed.map(s=>minutes(s.time))),last=Math.max(...timed.map(s=>minutes(s.time)+(s.duration||0)));
 return [Math.max(6,Math.floor(first/60)),Math.min(23,Math.max(Math.floor(first/60)+1,Math.ceil(last/60)))];
}
// How the day feels across those hours: where it starts, where it peaks, where it ends, and when
// rain is likely. Read from the hourly forecast where there is one, and the day's min and max
// where there is not.
export function temperatureArc(state,day,[from,to]){
 const hours=(hoursFor(state,day)||[]).filter(h=>h.h>=from&&h.h<=to);
 const feel=h=>h.feels??h.temp;
 if(hours.length>=3){
  const start=hours[0],end=hours.at(-1),peak=hours.reduce((a,b)=>feel(b)>feel(a)?b:a),low=hours.reduce((a,b)=>feel(b)<feel(a)?b:a);
  const wet=hours.filter(h=>(h.rain??0)>=50);
  return {hourly:true,start:{h:start.h,t:feel(start)},peak:{h:peak.h,t:feel(peak)},low:{h:low.h,t:feel(low)},end:{h:end.h,t:feel(end)},
   rain:wet.length?{from:wet[0].h,to:wet.at(-1).h+1}:null,code:hours.find(h=>h.code!=null)?.code??null};
 }
 const f=forecastFor(state,day);
 if(!f)return null;
 return {hourly:false,start:{h:from,t:f.min},peak:{h:14,t:f.max},low:{h:from,t:f.min},end:{h:to,t:Math.round((f.min+f.max)/2)},
  rain:(f.rain??0)>=50?{from:null,to:null}:null,code:f.code??null};
}
// The temperature lines: a swing worth dressing for, heat, cold, and rain with its hours.
function weatherLines(arc){
 if(!arc)return [{id:'no-forecast',icon:'🌡️',text:'No forecast saved for this day yet. Check the Weather page the evening before.'}];
 const out=[],{start,peak,end}=arc,swing=peak.t-Math.min(start.t,end.t);
 if(swing>=6)out.push({id:'layers',icon:'🧥',text:arc.hourly
  ?`Cool to start (${start.t}° at ${clock(start.h)}), ${peak.t>=26?'warm':'milder'} by ${clock(peak.h)} (${peak.t}°)${end.t<=peak.t-4?`, cooling to ${end.t}° by ${clock(end.h)}`:''}: layers — a light jumper or jacket that packs into a bag.`
  :`${start.t}° at the coolest and ${peak.t}° at the warmest: layers you can take off and carry.`});
 if(peak.t>=28)out.push({id:'hot',icon:'☀️',text:`Hot${arc.hourly?` around ${clock(peak.h)}`:''} (feels ${peak.t}°): light, breathable clothes, hats, sunscreen, and a water bottle each.`});
 else if(peak.t<=15)out.push({id:'cold',icon:'🧣',text:`Cold all day (no warmer than ${peak.t}°): a proper coat, and a hat and gloves for the boys.`});
 else if(swing<6&&peak.t<=19)out.push({id:'cool',icon:'🧥',text:`Cool all day (${Math.min(start.t,end.t)}–${peak.t}°): a jumper or light jacket on, not just in the bag.`});
 if(end.t<=16&&peak.t>16)out.push({id:'evening',icon:'🌙',text:`It drops to ${end.t}° by ${clock(end.h)}: something warm for the way home.`});
 const [label]=arc.code!=null?describe(arc.code):[''];
 if(arc.rain)out.push({id:'rain',icon:'☂️',text:arc.rain.from!=null?`Rain likely ${clock(arc.rain.from)}–${clock(arc.rain.to)}: a rain jacket or umbrellas, and shoes that cope with puddles.`:'Rain likely: rain jackets or umbrellas, and shoes that cope with puddles.'});
 else if(/rain|shower|drizzle|thunder/i.test(label))out.push({id:'rain',icon:'☂️',text:'Showers about: a compact umbrella in the bag.'});
 return out;
}
// How much walking the day holds, from the route cards' walks, the stops that are walked round
// rather than sat in, and whether it is a theme-park day, which is the most walking of all.
export function walkingLoad(state,day,steps){
 const walked=steps.reduce((n,s)=>n+(routeFor(s)||[]).filter(l=>l.mode==='walk').reduce((m,l)=>m+(l.minutes||0),0),0);
 const onFoot=steps.filter(s=>['sightseeing','shopping','entertainment'].includes(entryType(s).id)).length;
 const park=steps.some(s=>DRESS_RULES.find(r=>r.id==='park').test.test(text(s)))||/disney|universal|usj/i.test(state.days.find(d=>d.date===day)?.city||'');
 const level=park||onFoot>=7||walked>=60?'big':onFoot>=4||walked>=30?'moderate':'light';
 return {level,walked,onFoot,park};
}
function shoeLine(load,little){
 if(load.level==='big')return {id:'shoes',icon:'👟',text:`${load.park?'A theme-park day — often 15,000–20,000 steps':'A big walking day'}: the most comfortable broken-in trainers everyone owns, socks that do not slip, and blister plasters.${little?` ${little} will tire well before the end; bring the carrier or plan the sit-downs.`:''}`};
 if(load.level==='moderate')return {id:'shoes',icon:'👟',text:'A fair bit of walking: comfortable trainers rather than anything new.'};
 return {id:'shoes',icon:'👟',text:'A lighter day on foot: any comfortable shoes will do.'};
}
// The whole answer for a day: one headline and the lines under it. Each stop rule is said once
// and names the stops it is for, so the line can be checked against the plan.
export function whatToWear(state,day){
 if(!state?.days?.some(d=>d.date===day))return null;
 const steps=activeSteps(state,day).filter(s=>s.status!=='skipped');
 const arc=temperatureArc(state,day,outHours(steps));
 const load=walkingLoad(state,day,steps);
 const little=(state.members||[]).find(n=>{const a=personProfile(state,n).age;return Number.isInteger(a)&&a<=6;})||null;
 const rules=[];
 for(const r of DRESS_RULES){
  // A rule is about the place itself, not the train to it or the ticket for it.
  const at=steps.filter(s=>!['transport','admin'].includes(entryType(s).id)&&r.test.test(text(s)));
  // Where one of them is the booking — the game, not the dinner before it — that is the one named.
  const named=at.some(s=>s.locked||s.bookingTime)?at.filter(s=>s.locked||s.bookingTime):at;
  if(at.length)rules.push({id:r.id,icon:r.icon,text:r.text,stops:[...new Set(named.map(s=>s.title))].slice(0,3)});
 }
 // What the night-before check found on a venue's own pages, unless a parent dismissed it.
 const found=(state.dayChecks?.[day]?.notes||[]).filter(n=>n.kind==='dress'&&n.status!=='dismissed')
  .map(n=>({id:`check-${n.id}`,icon:'📌',text:`${n.title}${n.detail?` — ${n.detail}`:''}`,stops:n.stepId?[steps.find(s=>s.id===n.stepId)?.title].filter(Boolean):[],source:n.sources?.[0]?.url||''}));
 // Where rules overlap, the more particular one stands: shoes off is part of the temple line.
 if(rules.some(r=>r.id==='temple'))for(const r of rules)if(r.id==='shoes-off')r.stops=r.stops.filter(t=>!/temple|shrine/i.test(t));
 const stopRules=[...rules.filter(r=>r.stops.length),...found];
 const weather=weatherLines(arc),shoes=shoeLine(load,little);
 const headline=[weather.find(w=>['layers','hot','cold','cool'].includes(w.id))?.id==='layers'?'Layers':weather.find(w=>w.id==='hot')?'Light and cool':weather.find(w=>w.id==='cold')?'Warm coats':weather.find(w=>w.id==='cool')?'A jumper on':null,
  weather.some(w=>w.id==='rain')?'rain gear':null,
  load.level==='big'?'your comfiest trainers':load.level==='moderate'?'comfy shoes':null,
  stopRules.some(r=>r.id==='shoes-off'||r.id==='temple')?'socks for shoes-off':null].filter(Boolean);
 return {day,arc,load,weather,shoes,stops:stopRules,headline:headline.length?headline.join(', ').replace(/^./,c=>c.toUpperCase()):'Whatever is comfortable'};
}
