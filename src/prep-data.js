// Getting ready: the run-up to the trip, measured. Five things the whole family does before we
// fly — say who we are, vote on the ideas, learn some phrases, get every booking into the app,
// pack from the list — each counted from what is already in the trip, so ticking the real thing
// is what moves it. The countdown unlocks them one at a time, a hundred days out, fifty, thirty,
// a fortnight and a week, so there is always one thing to do next and never five at once.
import {tripCountdown} from './timing.js';
import {profileFilled,phrasesSeenBy,ticketList,packing} from './trip-features.js';
export const PHRASES_EACH=5;
export function prepMeasures(state){
 const people=state.members||[];
 const fixed=(state.steps||[]).filter(s=>s.day&&s.locked);
 const items=packing(state).items||[];
 return {
  profiles:{label:'Who we are',done:people.filter(n=>profileFilled(state,n)).length,total:people.length,page:'planning'},
  votes:{label:'Votes on the ideas',done:people.filter(n=>(state.proposals||[]).some(p=>p.votes?.[n])).length,total:people.length,page:'planning'},
  phrases:{label:'Phrases learnt',done:people.reduce((n,p)=>n+Math.min(PHRASES_EACH,Object.keys(phrasesSeenBy(state,p)).length),0),total:people.length*PHRASES_EACH,page:'phrases'},
  tickets:{label:'Bookings with a ticket',done:fixed.filter(s=>ticketList(state,{step:s,all:false}).length).length,total:fixed.length,page:'tickets'},
  packing:{label:'Packed',done:items.filter(i=>i.packedAt).length,total:items.length,page:'packing'}
 };
}
export const MILESTONES=[
 {at:100,measure:'profiles',title:'Tell the app who we are',hint:'Ages, likes, and anything to avoid, for all four of us.'},
 {at:50,measure:'votes',title:'Vote on the ideas',hint:'Everyone gives a thumbs up or down on the planning board.'},
 {at:30,measure:'phrases',title:`${PHRASES_EACH} phrases each`,hint:'Hello, thank you, excuse me… hear them and say them back.'},
 {at:14,measure:'tickets',title:'Every booking in the app',hint:'A ticket or confirmation on each fixed time.'},
 {at:7,measure:'packing',title:'Pack from the list',hint:'Tick things off as they go in the case.'}
];
const complete=m=>m.total>0&&m.done>=m.total;
// Where the run-up stands: how many days to go, and each milestone unlocked, finished or waiting.
export function runUp(state,today){
 const c=tripCountdown(state.days,today);
 if(!c||c.phase!=='before')return null;
 const measures=prepMeasures(state);
 const list=MILESTONES.map(m=>{const x=measures[m.measure];return {...m,...x,unlocked:c.days<=m.at,complete:complete(x)};});
 const now=list.find(m=>m.unlocked&&!m.complete)||null,next=list.find(m=>!m.unlocked)||null;
 return {days:c.days,milestones:list,now,next,finished:list.filter(m=>m.unlocked&&m.complete).length};
}
