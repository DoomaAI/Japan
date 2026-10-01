// Insider notes per stop: what someone who has been would tell you at the door. Not the fun
// facts, which are for the boys, but the working details — how the queue works (ticket machine
// first?), what payment is taken, the stroller and the toilets, where the lockers are, the best
// hour to arrive, and the mistake everybody makes. Looked up once, the night before the day,
// read over by a parent before anybody relies on it, and kept in the trip for no signal.
import {activeSteps} from './timing.js';
import {entryType} from './entry-types.js';
import {clamp,httpsLink as https} from './text.js';
export const INSIDER_FIELDS=[
 ['queue','How the queue works','🎟️'],['payment','Paying','💴'],['access','Stroller and toilets','🚻'],
 ['lockers','Lockers and bags','🧳'],['bestTime','Best time to arrive','⏰'],['mistake','The common mistake','⚠️']
];
export const INSIDER_STATUS=['draft','reviewed','dismissed'];
export const MAX_INSIDER_DAY=8,INSIDER_MAX=300;
// The stops worth a note: places you walk into, eat at or queue for — not the train there, the
// hotel or the ticket errand — and only those that do not have one yet.
export function insiderWanted(state,day){
 return activeSteps(state,day).filter(s=>s.status!=='skipped'&&['sightseeing','entertainment','food','cafe','shopping'].includes(entryType(s).id)&&!state.insider?.[s.id])
  .slice(0,MAX_INSIDER_DAY);
}
export function cleanInsider(found){
 if(!found||typeof found!=='object')return null;
 const out={};
 for(const [key] of INSIDER_FIELDS)out[key]=clamp(found[key],INSIDER_MAX);
 if(!INSIDER_FIELDS.some(([k])=>out[k]))return null;
 out.sources=(Array.isArray(found.sources)?found.sources:[]).map(s=>({title:clamp(s?.title,200),url:https(s?.url)})).filter(s=>s.url).slice(0,4);
 return out;
}
export const insiderOf=(state,stepId)=>state?.insider?.[stepId]||null;
// What a reader sees: a parent sees a draft to check; everyone else sees only what a parent has
// passed. A dismissed note is gone for everybody.
export function insiderShown(state,stepId,parent){
 const n=insiderOf(state,stepId);
 if(!n||n.status==='dismissed')return null;
 return n.status==='reviewed'||parent?n:null;
}
