import {activeSteps,japanDate} from './timing.js';
import {proposals,proposalPlacement} from './trip-features.js';
import {forecastFor} from './weather-data.js';
// One question, typed with a thumb. Longer than this is two questions, and two questions get
// one muddled answer, so the box stops rather than the server refusing it afterwards.
export const ASK_LIMIT=600;
// A dozen questions kept on the phone, which is a whole trip's worth of the ones worth keeping
// and still small enough to survive a full localStorage. The oldest falls off the end.
export const THREAD_KEEP=12;
// Four exchanges of it go back with the next question, so "and the day after?" means something.
export const ASK_HISTORY=4;
// The thread lives on the phone that asked, beside the saved guide pages and the arranged menu,
// rather than in the trip: a question one of us asked is not a change to the plan, nobody needs
// to agree to it, and the answer is worth having again on a dead signal.
export const askKey=name=>`japan.ask.${name||'family'}`;
export function readThread(name){
 try{const v=JSON.parse(localStorage.getItem(askKey(name)));return Array.isArray(v)?v:[];}
 catch{return [];}
}
export function writeThread(name,thread){
 const kept=thread.slice(0,THREAD_KEEP);
 try{localStorage.setItem(askKey(name),JSON.stringify(kept));}catch{}
 return kept;
}
// Whether this phone has anything to come back to. The screen is only offered where the
// deployment can answer at all, but an answer already saved here reads with no signal, so a
// phone holding one keeps the page even before its config has arrived. Asked on every render of
// the app, so it looks rather than parses.
export const hasAskHistory=user=>{
 try{const raw=localStorage.getItem(askKey(user?.name));return !!raw&&raw!=='[]';}
 catch{return false;}
};
// What goes back with the next question: whole exchanges, oldest first, as plain text. The
// model's own blocks are never replayed — nothing a previous answer carried can come back round.
export const askHistory=thread=>thread.slice(0,ASK_HISTORY).reverse()
 .flatMap(item=>[{role:'user',text:item.question},{role:'assistant',text:[item.verdict,item.answer].filter(Boolean).join(' ')}]);
const fmtDay=date=>new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(date+'T12:00:00+09:00'));
export {fmtDay as askDayLabel};
// Questions built out of the day in front of them, so the first one is a tap rather than a blank
// box. Everything here names something that is actually on the plan.
export function askStarters(state,day,now=new Date()){
 const days=state?.days||[];
 const today=japanDate(now),on=days.find(d=>d.date===day)||days.find(d=>d.date===today)||days[0];
 if(!on)return [];
 const steps=activeSteps(state,on.date),out=[];
 // The one worth asking about is something they would actually weigh up moving: not a booking,
 // not something already done, and not breakfast at the hotel they are standing in.
 const loose=steps.filter(s=>!s.locked&&!['done','skipped'].includes(s.status)&&s.kind!=='review');
 const movable=loose.find(s=>s.place&&s.place!==on.hotel&&!/^(breakfast|pack|check out|check in|taxi|walk)\b/i.test(s.title))||loose[0];
 const booked=steps.find(s=>s.locked);
 const weather=forecastFor(state,on.date);
 const idea=proposals(state).find(p=>proposalPlacement(state,p).state==='open');
 if(movable)out.push(`Is ${movable.title} better on ${fmtDay(on.date)} or the day after?`);
 if(weather&&(weather.rain??0)>=40)out.push(`There is rain forecast for ${fmtDay(on.date)}. What should we move?`);
 if(booked)out.push(`What time do we really need to leave for ${booked.title}?`);
 if(idea)out.push(`Where does ${idea.title} fit best in the trip?`);
 out.push(`What is the one thing we would regret missing in ${on.city}?`);
 return out.slice(0,4);
}
