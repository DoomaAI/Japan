import React from 'react';
import {ringsFor,dayScore} from './rings-data.js';
// Three rings for the day: stops, photos, the phrase. Drawn as Apple Fitness draws them, one
// inside the other, closing as the ticks come in; the family's day scores sit underneath.
const COLOURS=['var(--ring-stops,#e2583e)','var(--ring-photos,#3f8f6e)','var(--ring-phrase,#3d6fb6)'];
export default function Rings({state,user,day}){
 const me=user?.name&&state.members?.includes(user.name)?user.name:null;
 if(!me)return null;
 const rings=ringsFor(state,me,day);
 if(!rings[0].target&&!rings[1].done)return null;
 const score=rings.filter(r=>r.closed).length;
 return <section className="rings" aria-label="Three rings for the day">
  <svg viewBox="0 0 120 120" className="rings-art" role="img" aria-label={rings.map(r=>`${r.label} ${r.done} of ${r.target}`).join(', ')}>
   {rings.map((r,i)=>{const rad=50-i*14,c=2*Math.PI*rad;return <g key={r.id} transform="rotate(-90 60 60)">
    <circle cx="60" cy="60" r={rad} fill="none" stroke={COLOURS[i]} strokeOpacity=".18" strokeWidth="11"/>
    <circle cx="60" cy="60" r={rad} fill="none" stroke={COLOURS[i]} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${Math.max(0.001,r.share)*c} ${c}`}/>
   </g>;})}
  </svg>
  <div className="rings-text">
   <p className="eyebrow">YOUR RINGS · {score} OF 3 CLOSED</p>
   <ul>{rings.map((r,i)=><li key={r.id}><i style={{background:COLOURS[i]}} aria-hidden="true"/>{r.label} <b>{r.done}/{r.target}</b>{r.closed?' ✓':''}</li>)}</ul>
   <small>{(state.members||[]).filter(n=>n!==me).map(n=>`${n} ${dayScore(state,n,day)}`).join(' · ')}</small>
  </div>
 </section>;
}
