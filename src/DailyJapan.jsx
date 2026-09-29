import React from 'react';
import {Check} from 'lucide-react';
import {dailyJapan} from './daily-japan-data.js';
import SayIt from './SayIt.jsx';
// The A little Japan each day widget: before we fly, one phrase to say and one fact to read,
// each ticked off into the same logs the trip's own phrase and fact of the day use.
export default function DailyJapan({state,user,today,mutate,busy}){
 const d=dailyJapan(state,today,user?.name);if(!d)return null;
 const person=user?.name,member=state.members.includes(person);
 const learnt=()=>mutate({type:'phraseSeen',person,day:null,phraseIds:[d.phrase.id]});
 const read=()=>mutate({type:'factSeen',person,day:null,factIds:[d.fact.id]});
 return <section className="daily-japan" aria-label="A little Japan each day">
  <p className="eyebrow">A little Japan · {d.days} day{d.days===1?'':'s'} to go</p>
  {d.phrase&&<div className="daily-japan-part">
   <div className="daily-japan-phrase"><span aria-hidden="true">{d.phrase.icon}</span><strong>{d.phrase.en}</strong></div>
   <SayIt phrase={{...d.phrase,en:''}} size="small"/>
   {member&&(d.phraseLearnt?<p className="daily-japan-done"><Check size={15}/> Learnt</p>:<button type="button" disabled={busy} onClick={learnt}>I can say it</button>)}
  </div>}
  {d.fact&&<div className="daily-japan-part">
   <strong><span aria-hidden="true">{d.fact.icon}</span> {d.fact.title}</strong><p>{d.fact.text}</p>
   {member&&(d.factRead?<p className="daily-japan-done"><Check size={15}/> Read</p>:<button type="button" disabled={busy} onClick={read}>Got it</button>)}
  </div>}
 </section>;
}
