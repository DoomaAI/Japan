import React from 'react';
import {ChevronRight} from 'lucide-react';
import {anniversary} from './anniversary-data.js';
import {capsuleOpens,capsuleSealed} from './capsule-data.js';
import {photoUrl} from './PhotoDay.jsx';
// The On this day widget: a day of the trip brought back on its anniversary, and nothing on any
// other day, so it costs Home nothing the rest of the year.
export default function OnThisDay({state,today,dayLabel,go}){
 const a=anniversary(state,today);if(!a)return null;
 return <section className="on-this-day" aria-label={a.label}>
  {a.photo&&<img src={photoUrl(a.photo)} alt={`${a.title}, ${dayLabel(a.day)}`} loading="lazy"/>}
  <div><p className="eyebrow">{a.label}</p><h2>{a.title}</h2><small>{dayLabel(a.day,{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {a.city}</small>
   {a.best&&<p>Best bit: <b>{a.best.title}</b> ★ {a.best.average.toFixed(1)}</p>}
   {a.note&&<p className="on-this-day-note">“{a.note.length>160?`${a.note.slice(0,157)}…`:a.note}”</p>}
   <button type="button" onClick={()=>go('book')}>Open the photobook<ChevronRight size={16}/></button>
   {capsuleOpens(state)===today&&capsuleSealed(state).length>0&&<button type="button" className="primary" onClick={()=>go('capsule')}>The notes we sealed a year ago are open<ChevronRight size={16}/></button>}</div>
 </section>;
}
