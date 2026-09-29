// The trip told as a story: a run of full-screen cards to swipe through on the sofa at home,
// or during the trip as "so far". Every card is counted out of what the family already kept —
// the stops ticked, the stars given, the photos voted for — and a card with nothing to say
// is left out rather than shown empty.
import {activeSteps,tripCountdown} from './timing.js';
import {FOOD} from './food-data.js';
import {foodAverage,triedFood,photoOfTheDay,expenseSummary,stepRatings,stepThoughts} from './trip-features.js';
import {cityNames,personCounts} from './stamp-data.js';
import {crowns} from './leaderboard-data.js';
const CITY_ICON={Tokyo:'🗼',Kyoto:'⛩️',Osaka:'🏯',Nara:'🦌','Disney Resort':'🏨',Disneyland:'🏰',DisneySea:'🌋'};
const foodName=(state,id)=>{const f=FOOD.find(x=>x.id===id)||(state.foodItems||[]).find(x=>x.id===id);return f?String(f.en||f.title||'').split(' — ')[0]:null;};
export function recapStory(state,{today,parent=false}={}){
 const days=state.days||[],c=tripCountdown(days,today),over=c?.phase==='after';
 const steps=days.flatMap(d=>activeSteps(state,d.date)),done=steps.filter(s=>s.status==='done');
 const tried=Object.keys(state.food||{}).filter(id=>Object.keys(triedFood(state,id)).length);
 const rides=Object.values(state.parkRides||{}).filter(r=>Object.keys(r.ridden||{}).length).length;
 const cards=[];
 cards.push({kind:'title',title:state.tripName||'Our Japan trip',days:days.length,people:(state.members||[]).length,from:days[0]?.date,to:days.at(-1)?.date,sofar:!over,dayNumber:c?.phase==='during'?c.day:null});
 cards.push({kind:'numbers',stats:[
  ['🗾',cityNames(state).length,'places'],['✅',done.length,'stops done'],['📷',(state.photos||[]).length,'photos'],
  ['🎙️',(state.voiceNotes||[]).length,'voice notes'],['🍡',tried.length,'foods tried'],['🎢',rides,'rides']].filter(([,n])=>n>0)});
 cards.push({kind:'places',places:cityNames(state).map(city=>({city,icon:CITY_ICON[city]||'📍',days:days.filter(d=>String(d.city||'').split('/').map(x=>x.trim()).includes(city)).length}))});
 const rated=steps.map(s=>{const r=Object.values(stepRatings(state,s.id));return r.length?{step:s,average:Math.round(r.reduce((a,b)=>a+b,0)/r.length*10)/10}:null;}).filter(Boolean).sort((a,b)=>b.average-a.average);
 if(rated.length)cards.push({kind:'top',moments:rated.slice(0,5).map(r=>({id:r.step.id,title:r.step.title,day:r.step.day,average:r.average}))});
 const winners=days.map(d=>{const p=photoOfTheDay(state,d.date);return p?.winners?.length?{day:d.date,photo:p.winners[0]}:null;}).filter(Boolean);
 if(winners.length)cards.push({kind:'photos',winners});
 const foods=tried.map(id=>({id,name:foodName(state,id),average:foodAverage(state,id)})).filter(f=>f.name&&f.average!==null).sort((a,b)=>b.average-a.average);
 if(foods.length)cards.push({kind:'food',tried:tried.length,best:foods.slice(0,5)});
 const table=crowns(state);
 for(const person of state.members||[]){
  const mine=steps.map(s=>({step:s,stars:stepRatings(state,s.id)[person],thought:stepThoughts(state,s.id)[person]?.text||''})).filter(x=>x.stars).sort((a,b)=>b.stars-a.stars);
  const counts=personCounts(state,person),best=mine[0]||null;
  const shown=Object.values(counts).filter(x=>x.count>0).sort((a,b)=>b.count-a.count).slice(0,3);
  if(best||shown.length)cards.push({kind:'person',person,favourite:best&&{title:best.step.title,stars:best.stars,thought:best.thought||mine.find(x=>x.thought)?.thought||''},counts:shown,crowns:table.find(t=>t.person===person)?.crowns||0});
 }
 if(parent){const m=expenseSummary(state);if(m.total>0)cards.push({kind:'money',total:m.total,aud:m.aud,dailyAverage:m.dailyAverage});}
 cards.push({kind:'end',over});
 return cards;
}
