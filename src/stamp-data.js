// The stamp book. Japanese stations and sights keep an ink stamp by the gate for visitors to
// press into a book; this is ours, filled in by what the family has already ticked off rather
// than by anything new to remember. Family stamps are the places, sights, rides and trains we
// finished together; personal stamps are milestones — the fifth food tried, the tenth ride —
// counted from each person's own ticks. Nothing here is saved: it is read off the trip.
import {activeSteps,dayBehind} from './timing.js';
import {entryType} from './entry-types.js';
import {photosOf,phrasesSeenBy} from './trip-features.js';
import {bingoCount} from './bingo-data.js';
const CITY_ICONS={Tokyo:'🗼',Kyoto:'⛩️',Osaka:'🏯',Nara:'🦌','Disney Resort':'🏨',Disneyland:'🏰',DisneySea:'🌋'};
export const cityNames=state=>[...new Set((state.days||[]).flatMap(d=>String(d.city||'').split('/').map(c=>c.trim()).filter(Boolean)))];
const doneOn=s=>s.completedAt?String(s.completedAt).slice(0,10):s.day;
const sightIcon=t=>/shrine|jingu|temple|todai|buddha/i.test(t)?'⛩️':/bridge/i.test(t)?'🌉':/deer/i.test(t)?'🦌':/museum/i.test(t)?'🏛️':/sky|rooftop/i.test(t)?'🌇':/park|grove|forest/i.test(t)?'🌳':'📸';
const rideIcon=t=>/sumo|makuuchi|bow-twirling|ceremonial/i.test(t)?'🤼':/teamlab/i.test(t)?'✨':/kimono/i.test(t)?'👘':/cruise|boat/i.test(t)?'⛴️':/show|parade/i.test(t)?'🎭':'🎢';
const isTrain=t=>/nozomi|shinkansen|train|subway|metro|resort line/i.test(t);
// Every stop of the whole trip, in order, with whether it is done. A stop that belongs to a
// choice we did not take is not on the plan, so it is not a stamp still to get.
function tripSteps(state){return (state.days||[]).flatMap(d=>activeSteps(state,d.date));}
function collection(steps,pick,icon){
 const seen=new Set();
 return steps.filter(s=>pick(s)).filter(s=>{const k=s.title.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;})
  .map(s=>({id:s.id,label:s.title,icon:icon(s.title),earned:s.status==='done',on:s.status==='done'?doneOn(s):null}));
}
export function familyStamps(state,today){
 const steps=tripSteps(state);
 const cities=cityNames(state).map(city=>{
  const days=(state.days||[]).filter(d=>String(d.city||'').split('/').map(c=>c.trim()).includes(city));
  const got=days.find(d=>dayBehind(state,d.date,today)||activeSteps(state,d.date).some(s=>s.status==='done'));
  return {id:`city-${city}`,label:city,icon:CITY_ICONS[city]||'📍',earned:!!got,on:got?.date||null};
 });
 return [
  {id:'cities',title:'Places we went',stamps:cities},
  {id:'sights',title:'Sights',stamps:collection(steps,s=>entryType(s).id==='sightseeing',sightIcon)},
  {id:'rides',title:'Rides and shows',stamps:collection(steps,s=>entryType(s).id==='entertainment'&&!/^(meet|find|return)\b/i.test(s.title),rideIcon)},
  {id:'trains',title:'Trains',stamps:collection(steps,s=>entryType(s).id==='transport'&&isTrain(s.title),t=>/nozomi|shinkansen/i.test(t)?'🚅':'🚃')}
 ].map(c=>({...c,earned:c.stamps.filter(s=>s.earned).length}));
}
// How many of each thing a person has done, and the stamps at each milestone.
export const MILESTONES=[1,5,10,25,50];
export function personCounts(state,person){
 const has=o=>!!o?.[person];
 return {
  food:{label:'Foods tried',icon:'🍡',count:Object.values(state.food||{}).filter(f=>has(f.tried)).length},
  rides:{label:'Theme park rides',icon:'🎢',count:Object.values(state.parkRides||{}).filter(r=>has(r.ridden)).length},
  missions:{label:'Missions done',icon:'🏆',count:(state.challenges||[]).filter(c=>has(c.completions)).length},
  photos:{label:'Photos taken',icon:'📷',count:photosOf(state,person).length},
  phrases:{label:'Phrases learnt',icon:'💬',count:Object.keys(phrasesSeenBy(state,person)).length},
  hunts:{label:'Hunt finds',icon:'🔎',count:(state.hunts?.entries||[]).filter(e=>(e.triedBy||e.by)===person).length},
  spotted:{label:'Bingo squares',icon:'🎱',count:bingoCount(state,person)}
 };
}
export function personalStamps(state,person){
 return Object.entries(personCounts(state,person)).map(([id,c])=>{
  const next=MILESTONES.find(m=>m>c.count)||null;
  return {id,...c,stamps:MILESTONES.filter(m=>m<=c.count).map(m=>({id:`${id}-${m}`,label:`${m} ${c.label.toLowerCase()}`,icon:c.icon,milestone:m,earned:true})),next};
 });
}
export const stampTotal=(state,person,today)=>familyStamps(state,today).reduce((n,c)=>n+c.earned,0)+personalStamps(state,person).reduce((n,c)=>n+c.stamps.length,0);
