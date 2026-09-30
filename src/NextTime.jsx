import React from 'react';
import {Repeat,Copy} from 'lucide-react';
import {nextTimeNotes,nextTimeText} from './next-time.js';
import {dayLabel} from './AdventurePages.jsx';
// The lessons in one list, by day, for the next plan.
export default function NextTime({state,go,notice}){
 const notes=nextTimeNotes(state),days=[...new Set(notes.map(n=>n.day))];
 const copy=async()=>{try{await navigator.clipboard.writeText(nextTimeText(state));notice?.('Copied.');}catch{notice?.('Select the text and copy it.');}};
 return <>
  <p className="eyebrow">FOR THE NEXT PLAN</p><h1>Next time</h1>
  <p>What we would do differently, written on the stop while it was fresh. It goes into what the guide is told when it suggests anything, and it is the list to open before the next trip is planned.</p>
  {!notes.length&&<div className="empty"><Repeat/><h2>Nothing written yet.</h2><p>Under any stop, in What did we think, tap a Next time chip or write a line.</p></div>}
  {days.map(day=><section className="arrival-part" key={day}><h2>{dayLabel(day)}</h2>
   <ul className="home-front">{notes.filter(n=>n.day===day).map(n=><li key={`${n.id}-${n.person}`}><span><strong>{n.title}</strong><small>{n.text} · {n.person}</small></span>{go&&<button type="button" onClick={()=>go('days',day)}>Open the day</button>}</li>)}</ul>
  </section>)}
  {!!notes.length&&<button type="button" onClick={copy}><Copy size={16}/> Copy the list</button>}
 </>;
}
