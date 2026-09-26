import {minutes,asClock} from './timing.js';
// Some stops came out of the guide naming two or three places at once ("Togetsukyo Bridge and
// % Arabica"), which left one card, one set of directions and one Done for what is really
// several stops. Each is split once into its own stops. The first part keeps the original id,
// so its progress, reviews, photos and tickets stay with it; the rest follow straight after it.
// `at` is how many minutes after the original start a part begins, so a stop the family has
// already moved splits around its new time rather than the guide's.
export const SPLIT_SEED=1;
export const STOP_SPLITS={
 '2026-09-22-13':{title:'Crossing and Hachiko',parts:[
  {title:'Shibuya Crossing',place:'Shibuya Scramble Crossing',at:0,duration:10,notes:'Cross it properly once or twice; take photos and video.'},
  {title:'Hachiko Statue',place:'Hachiko Statue Shibuya',at:10,duration:10,notes:'Visit the statue and hear the story of Hachiko.'},
 ]},
 '2026-09-24-11':{title:'Hanamikoji, Shirakawa and Tatsumi Bridge',parts:[
  {title:'Hanamikoji Street',place:'Hanamikoji Street Kyoto',at:0,duration:5,notes:'Taxi drop-off at Hanamikoji x Shijo.'},
  {title:'Gion Shirakawa',place:'Shirakawa-minami-dori',at:5,duration:5,notes:'Willow-lined canal street, about a 2 minute walk.'},
  {title:'Tatsumi Bridge',place:'Tatsumi Bridge Gion Kyoto',at:10,duration:20,notes:'Classic Gion photo spot over the Shirakawa.'},
 ]},
 '2026-09-26-06':{title:'Togetsukyo Bridge and % Arabica',parts:[
  {title:'Togetsukyo Bridge',place:'Togetsukyo Bridge Kyoto',at:0,duration:20,notes:'River views and a bridge stroll.'},
  {title:'% Arabica',place:'% ARABICA Kyoto Arashiyama',at:20,duration:25,notes:'A second coffee stop by the river.'},
 ]},
 '2026-09-28-02':{title:'Breakfast and train to Osaka',parts:[
  {title:'Breakfast',place:'Hotel Kanra Kyoto',at:0,duration:30,notes:'Breakfast first, then walk to Kyoto Station.'},
  {title:'Train to Osaka',place:'Osaka Station',at:30,duration:30,notes:'JR Kyoto Line, then metro towards Shinsaibashi. Timing flexible.'},
 ]},
 '2026-09-28-06':{title:'Takoyaki and Glico sign',parts:[
  {title:'Takoyaki',place:'Takoyaki Wanaka Sennichimae Main Store',at:0,duration:20,notes:'Share one serve for the family.'},
  {title:'Glico sign at Ebisubashi',place:'Ebisubashi Osaka',at:20,duration:15,notes:'Classic Osaka photo stop.'},
 ]},
 '2026-10-02-03':{title:'Tsukiji snacks and matcha',parts:[
  {title:'Tsukiji market snacks',place:'Tsukiji Outer Market Tokyo',at:0,duration:30,notes:'Tamagoyaki, wagyu skewers, tuna and ichigo daifuku.'},
  {title:'Matcha Stand Maruni',place:'MATCHA STAND MARUNI Tokyo Tsukiji',at:30,duration:30,notes:'High-quality matcha right at the market.'},
 ]},
 '2026-10-02-06':{title:'Ueno museum and park',parts:[
  {title:'National Museum of Nature and Science',place:'National Museum of Nature and Science Tokyo',at:0,duration:30,notes:'Alternative from trip summary. Check opening and tickets.'},
  {title:'Ueno Park',place:'Ueno Park',at:30,duration:30,notes:''},
 ]},
 '2026-10-02-07':{title:'Ameyoko and matcha',parts:[
  {title:'Ameyoko',place:'Ameyoko Tokyo',at:0,duration:30,notes:''},
  {title:'Savor the Matcha',place:'Savor the Matcha',at:30,duration:30,notes:''},
 ]},
};
const shift=(time,at)=>time?asClock(minutes(time)+at):null;
export const partId=(id,i)=>i?`${id}-${i+1}`:id;
export function splitStop(step,parts){
 return parts.map(({at,...part},i)=>{
  const next={...step,...part,id:partId(step.id,i),order:step.order+i*3,time:shift(step.time,at),originalTime:shift(step.originalTime,at)};
  // A part at a different place starts clean: a pin or Japanese name for the old one would
  // send the taxi to the wrong spot.
  if(part.place!==step.place){for(const k of ['locationId','pin','phone','website'])delete next[k];next.japanese='';}
  if(!i)return next;
  next.bookingTime=null;next.locked=false;
  if(next.status==='started'){next.status='todo';delete next.startedAt;}
  return next;
 });
}
// Splits a stop only while it is still the one the guide wrote: renamed, backlogged or already
// split stops are left as the family has them.
export function splitSeeded(state){
 if((state.splitSeed||0)>=SPLIT_SEED)return state;
 const have=new Set((state.steps||[]).map(s=>s.id));
 const steps=(state.steps||[]).flatMap(s=>{
  const plan=STOP_SPLITS[s.id];
  if(!plan||s.title!==plan.title||!s.day||plan.parts.some((_,i)=>i&&have.has(partId(s.id,i))))return [s];
  return splitStop(s,plan.parts);
 });
 return {...state,steps,splitSeed:SPLIT_SEED};
}
