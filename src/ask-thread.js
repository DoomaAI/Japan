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
// The parents' questions are also kept in the trip, so an answer one of them got is on the
// other's phone too: "is Fushimi Inari better tomorrow" is a decision they make together, and
// asking it twice costs a search and gets two answers. The phone's own copy stays as it was,
// written first, so the answer is there with no signal and before the trip has caught up; the
// two are shown together, the trip's copy winning where both hold the same question.
export const SHARED_KEEP=24;
export const sharesThread=user=>user?.role==='parent';
export function mergeThreads(shared,local){
 const seen=new Set(),out=[];
 for(const item of [...(shared||[]),...(local||[])]){if(!item?.id||seen.has(item.id))continue;seen.add(item.id);out.push(item);}
 return out.sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
}
export const threadFor=(state,user,local)=>sharesThread(user)?mergeThreads(state?.askThread,local):local;
// What of an answer is worth the trip carrying: the words, not the token counts.
export const askItem=(item,by)=>({id:String(item.id),at:item.at,by,question:item.question,verdict:item.verdict||'',answer:item.answer||'',
 because:item.because||[],days:item.days||[],checkFirst:item.checkFirst||'',sources:item.sources||[],about:item.about||null,step:item.step||null,
 searches:item.usage?.searches||item.searches||0,...(item.draft?{draft:item.draft}:{})});
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
// Asked from a stop's own card. These are the questions somebody standing at the entrance
// actually has — how long, what to eat, what the boys will like — each naming the stop.
export function stepStarters(step){
 if(!step?.title)return [];
 const name=step.place||step.title;
 return [`How long do we really need at ${name}?`,`What should the boys not miss at ${name}?`,
  `Is there somewhere to eat near ${name}?`,`What is the best way to get to ${name} from the stop before?`];
}
