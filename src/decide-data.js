import {proposals,proposalPlacement,proposalVoters,proposalMusts,ideaFit,profileFilled,party} from './trip-features.js';
import {forecastFor,describe} from './weather-data.js';
// Choosing between ideas for a day, together. Four things decide it — the weather, the cost,
// what each of us is into, and how the family has voted — and each person says how much each
// of those matters to them. The group's weighting is the average of everyone's, so a boy who
// cares only about what he likes is counted, and so is a parent who cares about the budget.
export const PRIORITIES=[['weather','Weather'],['cost','Cost'],['likes','What we are into'],['votes','Votes & must-dos']];
export const PRIORITY_LEVELS=[[0,'Not fussed'],[1,'A little'],[2,'Matters'],[3,'Matters most']];
export const DEFAULT_PRIORITY=2;
export const SETTINGS=[['','Work it out'],['indoor','Indoors'],['outdoor','Outdoors'],['mixed','Some of each']];
export const settingLabel=id=>(SETTINGS.find(([key])=>key===id)||SETTINGS[0])[1];
export const validPriorities=v=>!!v&&typeof v==='object'&&!Array.isArray(v)
 &&Object.keys(v).every(k=>PRIORITIES.some(([id])=>id===k))
 &&Object.values(v).every(n=>PRIORITY_LEVELS.some(([level])=>level===n));
export function personPriorities(state,name){
 const set=party(state).priorities?.[name];
 return {...Object.fromEntries(PRIORITIES.map(([id])=>[id,DEFAULT_PRIORITY])),...(set?.weights||{})};
}
export const prioritiesSet=(state,name)=>!!party(state).priorities?.[name];
// Everyone's weighting averaged. Those who have not said anything count as "matters" on every
// front, so the average is always over the whole family rather than over whoever got to it first.
export function groupPriorities(state){
 const members=state.members||[];
 return Object.fromEntries(PRIORITIES.map(([id])=>[id,
  members.length?members.reduce((t,n)=>t+personPriorities(state,n)[id],0)/members.length:DEFAULT_PRIORITY]));
}
// Indoors or out. Said on the card if someone chose; otherwise read from the words on it, and
// left unknown rather than guessed when nothing gives it away.
const OUTDOOR=['park','garden','hike','walk','trail','beach','river','lake','mountain','forest','bamboo','shrine','temple','torii','zoo','deer','festival','market','street','view','lookout','boat','cruise','cycle','bike','picnic','playground','theme park','disney','universal','castle grounds','outdoor','open-air','yokocho','night market','illumination','fireworks'];
const INDOOR=['museum','gallery','aquarium','teamlab','arcade','mall','department','depachika','restaurant','cafe','café','bar','izakaya','ramen','sushi','cinema','theatre','theater','kabuki','karaoke','onsen','sento','spa','workshop','class','cooking','indoor','store','shop','bowling','planetarium','exhibition','dome','stadium','underground','station'];
const hit=(text,word)=>new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'u').test(text);
export function ideaSetting(p){
 if(['indoor','outdoor','mixed'].includes(p.setting))return {setting:p.setting,said:true};
 const text=[p.title,p.place,p.notes,...(p.tags||[])].filter(Boolean).join(' ').toLowerCase();
 const out=OUTDOOR.some(w=>hit(text,w)),inn=INDOOR.some(w=>hit(text,w))||['food','shopping'].includes(p.category);
 return {setting:out&&inn?'mixed':out?'outdoor':inn?'indoor':null,said:false};
}
// How the day's forecast suits it, from 0 to 1. A wet day ruins a garden and makes a museum;
// a fine day spent entirely indoors is a small waste of a fine day, not a disaster.
export function weatherFit(entry,setting){
 if(!entry)return {score:null,note:'No forecast for this day yet'};
 const [label]=describe(entry.code);
 const wet=/rain|shower|drizzle|thunder|snow/i.test(label)||(entry.rain??0)>=50;
 const storm=/thunder|heavy/i.test(label);
 const hot=entry.max>=31,cold=entry.max<=8;
 const s=setting||'mixed';
 if(wet){
  const score={outdoor:storm?0:.15,mixed:storm?.35:.5,indoor:1}[s];
  return {score,note:s==='indoor'?`Indoors, and ${label.toLowerCase()} is forecast`:`${label}${entry.rain!==null?` · ${entry.rain}% chance of rain`:''}`};
 }
 if(hot)return {score:{outdoor:.45,mixed:.7,indoor:1}[s],note:s==='indoor'?`Out of the heat · ${entry.max}°`:`Hot · ${entry.max}°`};
 if(cold)return {score:{outdoor:.5,mixed:.75,indoor:1}[s],note:`Cold · ${entry.max}°`};
 return {score:{outdoor:1,mixed:.9,indoor:.75}[s],note:s==='indoor'?`${label} — a shame to be inside`:`${label} · ${entry.max}°`};
}
// What it costs all of us. A price marked "each" or "per person" is multiplied by the people it
// is for; anything else is taken as the price for the group, as the board's cost note says.
const PER_HEAD=/\b(each|per person|per head|a head|pp|per adult|per child|a person)\b/i;
export function groupCost(state,p){
 if(p.cost===null||p.cost===undefined)return null;
 const heads=(p.suitableFor||[]).length||(state.members||[]).length||1;
 const each=PER_HEAD.test(p.costNote||'');
 return {yen:each?p.cost*heads:p.cost,each,heads};
}
export function costFit(state,p,dearest){
 const c=groupCost(state,p);
 if(!c)return {score:null,note:'Cost not known',yen:null};
 const budget=party(state).budget;
 const note=`¥${c.yen.toLocaleString('en-AU')}${c.each?` for ${c.heads}`:''}`;
 if(!c.yen)return {score:1,note:'Free',yen:0};
 if(budget)return {score:Math.max(0,1-c.yen/budget),note:`${note} · ${Math.round(c.yen/budget*100)}% of the day’s budget`,yen:c.yen};
 return {score:dearest?1-.8*c.yen/dearest:1,note,yen:c.yen};
}
// How many of the people it is for would actually want it, from their profiles; the ones who
// said they would rather avoid something on the card count against it.
export function likesFit(state,p){
 const members=state.members||[];
 if(!members.some(n=>profileFilled(state,n)))return {score:null,note:'Nobody has filled in what they like',fans:[],avoid:[]};
 const fits=members.map(n=>[n,ideaFit(state,{...p,votes:{},musts:{}},n)]).filter(([,f])=>f.score!==null);
 if(!fits.length)return {score:null,note:'Suits nobody on the trip',fans:[],avoid:[]};
 const fans=fits.filter(([,f])=>f.score>0).map(([n])=>n),avoid=fits.filter(([,f])=>f.avoid.length).map(([n])=>n);
 const score=Math.max(0,Math.min(1,(fans.length-.5*avoid.length)/fits.length));
 return {score,note:fans.length?`Up ${fans.join(', ')}’s street`:'Nothing anyone ticked',fans,avoid};
}
// The votes already cast: a yes is one, a no takes one away, a must-do counts one and a half.
export function votesFit(state,p){
 const n=(state.members||[]).length||1,up=proposalVoters(p,1),down=proposalVoters(p,-1),musts=proposalMusts(p);
 if(!up.length&&!down.length&&!musts.length)return {score:.5,note:'No votes yet'};
 const net=up.length-down.length+1.5*musts.length;
 const bits=[up.length&&`${up.length} yes`,down.length&&`${down.length} no`,musts.length&&`${musts.join(', ')}’s must-do`].filter(Boolean);
 return {score:Math.max(0,Math.min(1,.5+net/(2*n))),note:bits.join(' · ')};
}
// The ideas worth weighing up for a day: up for a vote, and either hoped for this day or for
// no day in particular. "All" widens it to every open idea, whichever day it was hoped for.
export function candidates(state,day,{all=false}={}){
 return proposals(state).filter(p=>proposalPlacement(state,p).state==='open'&&(all||!p.day||p.day===day));
}
// Another day in the same city where the weather would suit it clearly better, if there is one.
export function betterDay(state,p,day){
 const city=state.days.find(d=>d.date===day)?.city;
 const setting=ideaSetting(p).setting;
 const here=weatherFit(forecastFor(state,day),setting).score;
 if(here===null||setting==='indoor')return null;
 let best=null;
 for(const d of state.days){
  if(d.date===day||d.city!==city)continue;
  const fit=weatherFit(forecastFor(state,d.date),setting);
  if(fit.score!==null&&fit.score>=here+.35&&(!best||fit.score>best.score))best={date:d.date,score:fit.score,note:fit.note};
 }
 return best;
}
// Every candidate scored against the group's weighting. A criterion with nothing to go on — no
// forecast yet, no price — is left out of that idea's sum rather than counted as a zero, and the
// card says so, so a missing price never quietly makes something look cheap or dear.
export function decide(state,day,{all=false,weights=groupPriorities(state)}={}){
 const list=candidates(state,day,{all});
 const dearest=Math.max(0,...list.map(p=>groupCost(state,p)?.yen||0));
 const entry=forecastFor(state,day);
 return list.map(p=>{
  const where=ideaSetting(p);
  const parts={weather:weatherFit(entry,where.setting),cost:costFit(state,p,dearest),likes:likesFit(state,p),votes:votesFit(state,p)};
  let sum=0,weight=0;
  for(const [id] of PRIORITIES){const w=weights[id]||0,s=parts[id].score;if(s===null||!w)continue;sum+=w*s;weight+=w;}
  return {proposal:p,setting:where,parts,match:weight?sum/weight:null,musts:proposalMusts(p),better:betterDay(state,p,day)};
 }).sort((a,b)=>(b.match??-1)-(a.match??-1)||b.musts.length-a.musts.length||a.proposal.title.localeCompare(b.proposal.title));
}
