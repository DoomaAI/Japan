import React from 'react';
import PageTitle from './PageTitle.jsx';
import {House,PlaneLanding,ListChecks,Check,Clock} from 'lucide-react';
import {AWAY_LIST,LANDING_LIST,onTodoList,clockShift} from './home-front.js';
import {japanDate} from './timing.js';
// The house while we are away and the first day back: two short lists, each line one tap from
// the family to-do list, and the clocks-change note for a trip that crosses daylight saving.
function Lines({state,items,day,mutate,busy}){
 return <ul className="home-front">{items.map(item=>{const on=onTodoList(state,item);
  return <li key={item.id}>
   <span><strong>{item.title}</strong><small>{item.note}</small></span>
   {on
    ?<span className="tag">{on.doneAt?<><Check size={13}/> Done</>:<><ListChecks size={13}/> On the list</>}</span>
    :<button type="button" disabled={busy||!mutate} onClick={()=>mutate({type:'todoAdd',title:item.title,kind:'do',day,person:'Family',notes:item.note})}><ListChecks size={14}/> Put on the list</button>}
  </li>;})}</ul>;
}
export default function HomeFront({state,mutate,busy,go}){
 const shift=clockShift(state?.days),last=state?.days?.at(-1)?.date||null,today=japanDate();
 const home=(n,label)=>n===0?'the same time':`${Math.abs(n)===1?'one hour':`${Math.abs(n)} hours`} ${n>0?'ahead':'behind'}`;
 return <>
  <p className="eyebrow">THE OTHER END</p><PageTitle help={<><p>The list nobody writes down: what the house needs while we are gone, and what the first evening back needs. Each line goes onto the family to-do list with one tap, so it is ticked where everything else is ticked.</p></>}>Home while we’re away</PageTitle>
  {shift&&<p className="callout"><Clock size={18}/><span><strong>Clocks at home {today>=shift.day?'changed':'change'} on {new Date(`${shift.day}T12:00:00Z`).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).replace(/,? 2026/,'')}.</strong> Until then home is {home(shift.before)}; from then on it is {home(shift.after)}. The flight lands at the time on the ticket either way; the call to the grandparents and the first alarm back move.</span></p>}
  <section className="arrival-part"><h2><House size={20}/> While we are away</h2><Lines state={state} items={AWAY_LIST} day={null} mutate={mutate} busy={busy}/></section>
  <section className="arrival-part"><h2><PlaneLanding size={20}/> The first day home</h2><p>Put on the last day of the trip, so they turn up on that day’s to-dos.</p><Lines state={state} items={LANDING_LIST} day={last} mutate={mutate} busy={busy}/></section>
  {go&&<p><button type="button" onClick={()=>go('todo')}><ListChecks size={16}/> Open the to-do list</button></p>}
 </>;
}
