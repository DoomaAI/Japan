// Dinner tonight. On a trip day with nothing on the plan for dinner, a card from four o'clock
// offers somewhere to eat in two places: near the last stop of the day, and at or near tonight's
// hotel. Each place says what a family needs to know before walking in — children welcome,
// non-smoking, whether to book and how, a picture or English menu, cash only — and carries a
// reservation message in Japanese to show or send. Once a dinner is on the plan, or this phone
// has put the card away for the day, it is gone.
import {activeSteps} from './timing.js';
import {entryType} from './entry-types.js';
import {stayFor} from './stay-data.js';
import {clamp} from './text.js';
export const DINNER_FROM='16:00',DINNER_UNTIL='21:30',DINNER_PER_ANCHOR=3;
export const BOOKING=[['walk-in','Walk in'],['recommended','Booking recommended'],['required','Booking needed'],['unknown','Not sure about booking']];
export const CHANNELS=[['tablecheck','TableCheck'],['tabelog','Tabelog'],['omakase','OMAKASE'],['website','Its own website'],['phone','Phone only'],['none','No bookings'],['unknown','Not known']];
export const MENUS=[['picture','Picture menu'],['english','English menu'],['japanese','Japanese only'],['unknown','Menu not known']];
const evening=t=>!!t&&t>='16:30';
const EVENING_MEAL=/\b(dinner|supper|izakaya|yakiniku|kaiseki|teppanyaki|evening meal)\b|夕食|夕飯/i;
const NOT_DINNER=/\b(breakfast|lunch|brunch|snacks?|bites|ice cream|dessert|cheesecake|pancake|donut|bakery)\b/i;
// A dinner is on the plan when a meal stop sits in the evening, or a stop says it is dinner.
export function hasDinnerPlan(state,day){
 return activeSteps(state,day).some(s=>s.status!=='skipped'&&(EVENING_MEAL.test(`${s.title} ${s.notes||''}`.slice(0,300))||(entryType(s).id==='food'&&evening(s.time)&&!NOT_DINNER.test(s.title))));
}
// Where to look: the last stop of the day that is somewhere (not a train, a check-in or a
// ticket errand), and tonight's hotel. One place when the day ends at the hotel.
export function dinnerAnchors(state,day){
 const stops=activeSteps(state,day).filter(s=>s.status!=='skipped'&&!['transport','hotel','admin'].includes(entryType(s).id)&&(s.place||s.title));
 const last=stops.at(-1)||null,stay=stayFor(state,day);
 const out=[];
 if(last)out.push({id:'last',label:last.title,place:last.place||last.title,stepId:last.id});
 if(stay&&!stay.checkingOut){
  const hotel=stay.hotel,same=last&&`${last.place||''} ${last.title}`.toLowerCase().includes(String(hotel).toLowerCase().split(' ')[0]);
  if(same)out[0]={...out[0],id:'hotel',label:hotel,place:stay.address||hotel};
  else out.push({id:'hotel',label:hotel,place:stay.address||hotel});
 }
 return out;
}
export const dinnerShows=(state,day,today,clock,dismissed=false)=>!dismissed&&day===today&&clock>=DINNER_FROM&&clock<DINNER_UNTIL
 &&(state?.days||[]).some(d=>d.date===day)&&!hasDinnerPlan(state,day)&&dinnerAnchors(state,day).length>0;
export const dinnerOf=(state,day)=>state?.dinner?.[day]||null;
// The reservation request, written by the app rather than by a model: the party, the time, and the
// asks that matter, in polite Japanese with the English underneath so a parent knows what it says.
export function reservationMessage({time='18:00',adults=2,children=[8,5],name=''}={}){
 const n=adults+children.length,kids=children.length?`（大人${adults}名・子ども${children.length}名、${children.join('歳と')}歳）`:'';
 return {ja:`本日${time}から${n}名${kids}で予約をお願いできますか。禁煙席を希望します。子ども用の椅子や食器があれば助かります。${name?`名前は${name}です。`:''}よろしくお願いいたします。`,
  en:`Could we book a table for ${n} today from ${time}${children.length?` (${adults} adults and ${children.length} children, aged ${children.join(' and ')})`:''}? Non-smoking please. A child's chair or cutlery would help.${name?` The name is ${name}.`:''} Thank you.`};
}
// What a model sends back, checked: lists the screen knows, links only as the search saw them.
const pick=(v,list,fallback)=>list.some(([id])=>id===v)?v:fallback;
export function cleanDinnerOption(o,checkLink=u=>u){
 const title=clamp(o?.title,120);if(!title)return null;
 const votes=Number.isInteger(o?.ratingCount)&&o.ratingCount>=0?o.ratingCount:null;
 const rating=Number.isFinite(o?.rating)&&o.rating>=1&&o.rating<=5&&(votes===null||votes>=20)?Math.round(o.rating*10)/10:null;
 return {title,japanese:clamp(o.japanese,120),cuisine:clamp(o.cuisine,80),area:clamp(o.area,160),
  walkMinutes:Number.isInteger(o.walkMinutes)&&o.walkMinutes>=0&&o.walkMinutes<=60?o.walkMinutes:null,
  kidsWelcome:o.kidsWelcome===true,nonSmoking:o.nonSmoking===true?true:o.nonSmoking===false?false:null,
  booking:pick(o.booking,BOOKING,'unknown'),channel:pick(o.channel,CHANNELS,'unknown'),menu:pick(o.menu,MENUS,'unknown'),
  cashOnly:o.cashOnly===true?true:o.cashOnly===false?false:null,cancellation:clamp(o.cancellation,200),
  rating,ratingCount:rating===null?null:votes,priceBand:clamp(o.priceBand,10),openNote:clamp(o.openNote,160),why:clamp(o.why,220),
  website:checkLink(o.website)||'',bookingUrl:checkLink(o.bookingUrl)||''};
}
// Kid-friendly and non-smoking lead, then walk-ins (no booking to fight over), then the rating.
export const rankDinner=list=>[...list].sort((a,b)=>(b.kidsWelcome-a.kidsWelcome)||((b.nonSmoking===true)-(a.nonSmoking===true))||((a.booking==='walk-in'?0:1)-(b.booking==='walk-in'?0:1))||((b.rating||0)-(a.rating||0)));
// Swiping for dinner. With more than one place on the card, everyone swipes on their own phone —
// right for "I feel like that", left for "not tonight" — and the card shows where the family
// agrees. Each vote is one person's, on one place, kept on the day with the options.
export const dinnerKey=(group,option)=>`${group.anchor}:${option.title}`;
export const dinnerOptions=found=>(found?.groups||[]).flatMap(g=>g.options.map(o=>({key:dinnerKey(g,o),group:g,option:o})));
export const myDinnerVotes=(found,name)=>Object.fromEntries(Object.entries(found?.votes||{}).filter(([,v])=>v?.[name]).map(([k,v])=>[k,v[name]]));
// Best agreement first: everyone yes, then the most yeses with no noes, then the most yeses.
export function dinnerMatches(found,members){
 const out=dinnerOptions(found).map(x=>{
  const v=found?.votes?.[x.key]||{},yes=members.filter(n=>v[n]==='yes'),no=members.filter(n=>v[n]==='no'),waiting=members.filter(n=>!v[n]);
  return {...x,yes,no,waiting,everyone:yes.length===members.length&&members.length>0,clear:yes.length>=2&&!no.length};
 }).filter(x=>x.yes.length);
 return out.sort((a,b)=>(b.everyone-a.everyone)||(b.clear-a.clear)||(b.yes.length-a.yes.length)||(a.no.length-b.no.length));
}
// One vote, checked: a member of the family, a place that is on tonight's card.
export function applyDinnerVote(state,{day,key,vote,reset},name){
 const found=state?.dinner?.[day];
 if(!found)return {error:'There is nothing to swipe on for that day.'};
 if(!(state.members||[]).includes(name))return {error:'Only the family swipes.'};
 const votes={...(found.votes||{})};
 if(reset){for(const k of Object.keys(votes)){const {[name]:_,...rest}=votes[k];votes[k]=rest;}}
 else{
  if(!dinnerOptions(found).some(x=>x.key===key))return {error:'That place is not on the card any more.'};
  if(!['yes','no'].includes(vote))return {error:'Swipe yes or no.'};
  votes[key]={...(votes[key]||{}),[name]:vote};
 }
 return {state:{...state,dinner:{...state.dinner,[day]:{...found,votes}}}};
}
