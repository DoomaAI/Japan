import React,{useState} from 'react';
import {familyStamps,personalStamps} from './stamp-data.js';
// The stamp book: the family's stamps for where we went, then one person's milestone stamps.
// A stamp still to get is drawn as an empty ring with its name, so there is something to aim for.
function Stamp({s,dayLabel}){
 return <li className={`stamp${s.earned?' earned':''}`} title={s.label}>
  <span className="stamp-ink" aria-hidden="true">{s.earned?s.icon:'?'}</span>
  <span className="stamp-label">{s.milestone?<b>{s.milestone}</b>:null}{s.milestone?s.label.replace(/^\d+ /,' '):s.label}</span>
  {s.on&&<small>{dayLabel(s.on,{day:'numeric',month:'short'})}</small>}
 </li>;
}
export default function Stamps({state,user,today,dayLabel,go}){
 const [person,setPerson]=useState(user?.name||state.members[0]);
 const family=familyStamps(state,today),mine=personalStamps(state,person);
 const got=family.reduce((n,c)=>n+c.earned,0),of=family.reduce((n,c)=>n+c.stamps.length,0),personal=mine.reduce((n,c)=>n+c.stamps.length,0);
 return <>
  <p className="eyebrow">PRESSED ALONG THE WAY</p><h1>Stamp book</h1>
  <p>Every station and sight in Japan keeps a stamp for visitors. These are ours, earned by ticking off what we did.</p>
  <div className="stamp-summary"><strong>{got}</strong><span>of {of} family stamps<small>{personal} milestone stamp{personal===1?'':'s'} for {person}</small></span></div>
  {family.map(c=><section className="stamp-page" key={c.id}><div className="section-heading"><h2>{c.title}</h2><span>{c.earned} of {c.stamps.length}</span></div>
   <ul className="stamp-grid">{[...c.stamps].sort((a,b)=>b.earned-a.earned).map(s=><Stamp key={s.id} s={s} dayLabel={dayLabel}/>)}</ul></section>)}
  <section className="stamp-page"><div className="section-heading"><h2>Milestones</h2>
   <select aria-label="Whose milestones" value={person} onChange={e=>setPerson(e.target.value)}>{state.members.map(m=><option key={m}>{m}</option>)}</select></div>
   {mine.map(c=><div className="stamp-milestone" key={c.id}>
    <p><span aria-hidden="true">{c.icon}</span> <b>{c.label}</b> · {c.count}{c.next&&<small>{c.next-c.count} more for the {c.next} stamp</small>}</p>
    {c.stamps.length>0&&<ul className="stamp-grid small">{c.stamps.map(s=><Stamp key={s.id} s={s} dayLabel={dayLabel}/>)}</ul>}
   </div>)}
  </section>
  {go&&<button type="button" className="button" onClick={()=>go('leaderboard')}>See the family leaderboard</button>}
 </>;
}
