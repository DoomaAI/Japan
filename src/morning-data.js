// Before we head out: the things to have in the bag, as a list ticked off each morning rather
// than a sentence read once. The list is built for the day in hand — tickets on a day with a
// booking, cases on a day we change hotel, umbrellas when the forecast says so — on top of the
// half-dozen that are the same every day. Ticks live on the phone doing the ticking, because
// "have we got the passports" is answered by whoever is holding the bag, and they reset by
// themselves because each day has its own key. A streak counts mornings finished in a row.
import {forecastFor,morningNeeds} from './weather-data.js';
import {activeSteps} from './timing.js';
import {ticketList} from './trip-features.js';
export const MORNING_ALWAYS=[
 {id:'passports',label:'Passports',emoji:'🛂',why:'Everyone carries theirs in Japan, and the tax-free counter asks for them.'},
 {id:'ic',label:'IC cards',emoji:'🚃',why:'For the gates, the buses and the konbini.'},
 {id:'phones',label:'Phones charged',emoji:'🔋'},
 {id:'battery',label:'Battery pack',emoji:'🔌'},
 {id:'cash',label:'Some yen in cash',emoji:'💴'},
 {id:'water',label:'Water bottles',emoji:'💧'}
];
const WEATHER_ITEMS={umbrella:{id:'umbrella',label:'Umbrellas',emoji:'☂️'},jumper:{id:'jumpers',label:'Jumpers',emoji:'🧥'},water:{id:'hats',label:'Hats and sunscreen',emoji:'🧢'},snow:{id:'shoes',label:'Proper shoes',emoji:'🥾'}};
export function morningList(state,day){
 const items=[...MORNING_ALWAYS],seen=new Set(items.map(i=>i.id)),add=item=>{if(!seen.has(item.id)){seen.add(item.id);items.push(item);}};
 const steps=activeSteps(state,day).filter(s=>!['done','skipped'].includes(s.status));
 if(steps.some(s=>s.locked&&ticketList(state,{step:s,all:false}).length))add({id:'tickets',label:'Today’s tickets on the phone',emoji:'🎟️',why:'A booking today has tickets attached.'});
 const i=(state.days||[]).findIndex(d=>d.date===day);
 if(i>0&&state.days[i-1].hotel!==state.days[i].hotel)add({id:'cases',label:'Cases packed, nothing left in the room',emoji:'🧳',why:`We move to ${state.days[i].hotel} today.`});
 if(i>=0&&i===state.days.length-1)add({id:'cases',label:'Cases packed, nothing left in the room',emoji:'🧳',why:'Last day: everything comes home with us.'});
 for(const n of morningNeeds(forecastFor(state,day))?.needs||[]){const w=WEATHER_ITEMS[n.id];if(w)add({...w,why:n.text});}
 return items;
}
const KEY=day=>`japan.morning.${day}`,STREAK='japan.morning.streak';
export const readTicks=day=>{try{const v=JSON.parse(localStorage.getItem(KEY(day)));return Array.isArray(v)?v:[];}catch{return [];}};
export const writeTicks=(day,ticks)=>{try{localStorage.setItem(KEY(day),JSON.stringify(ticks));}catch{}};
export const readStreak=()=>{try{return {count:0,last:null,...(JSON.parse(localStorage.getItem(STREAK))||{})};}catch{return {count:0,last:null};}};
export const writeStreak=s=>{try{localStorage.setItem(STREAK,JSON.stringify(s));}catch{}};
// A morning finished the day after the last one finished carries the streak on; a gap starts it
// again at one; finishing the same morning twice (untick, tick) changes nothing.
//
// The streak freeze: one missed morning a week is forgiven — a hotel-move day, a rain day, the
// morning everyone overslept — so a streak that is otherwise unbroken carries on over a single
// gap, and says so. Two gaps, or a second gap inside a week of the last forgiven one, start it
// again. A freeze is the day it covered, kept with the streak.
export const FREEZE_DAYS=7;
const daysBetween=(a,b)=>Math.round((Date.parse(`${b}T12:00:00Z`)-Date.parse(`${a}T12:00:00Z`))/86400000);
export function nextStreak(streak,day,days){
 if(streak.last===day)return streak;
 const i=days.findIndex(d=>d.date===day),prev=i>0?days[i-1].date:null,before=i>1?days[i-2].date:null;
 const frozen=Array.isArray(streak.frozen)?streak.frozen:[];
 if(streak.last&&streak.last===prev)return {...streak,count:streak.count+1,last:day,frozen};
 const recent=frozen.some(f=>daysBetween(f,day)<FREEZE_DAYS);
 if(streak.last&&streak.last===before&&!recent)return {count:streak.count+1,last:day,frozen:[...frozen,prev].slice(-4),forgiven:prev};
 return {count:1,last:day,frozen:[]};
}
// Whether a missed morning would be forgiven today, for the line under the checklist.
export function freezeReady(streak,day){
 const frozen=Array.isArray(streak?.frozen)?streak.frozen:[];
 return !frozen.some(f=>daysBetween(f,day)<FREEZE_DAYS);
}
export const streakWords=(n,forgiven=null)=>n>=2?`${n} mornings in a row${forgiven?' · one missed morning forgiven this week':''}`:n===1?'First morning done':'';
