import React,{useState} from 'react';
import {WifiOff} from 'lucide-react';
import {dayMap,project,scaleBar} from './day-map-data.js';
// The day map on Today: a drawing of where the stops are and the order we go in, which needs no
// signal because nothing in it comes from the network. Tap a mark for its stops.
const W=360,H=300;
export default function DayMap({state,day,selectStep}){
 const {marks,path,legs,rough}=dayMap(state,day),[open,setOpen]=useState(null);
 if(marks.length<2)return null;
 const {points,kmPerPx}=project(marks,W,H),bar=scaleBar(kmPerPx,W),chosen=open!=null?marks[open]:null;
 const total=legs.reduce((a,l)=>a+l.km,0);
 return <details className="day-map"><summary><span>Day map</span><small><WifiOff size={13}/> works with no signal · {total<1?`${Math.round(total*1000)} m`:`${total.toFixed(1)} km`} as the crow flies</small></summary>
  <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sketch map of ${marks.length} places for the day`}>
   <rect width={W} height={H} rx="12" className="dm-bg"/>
   <polyline points={path.map(i=>`${points[i].x},${points[i].y}`).join(' ')} className="dm-route"/>
   {legs.map(l=>{const a=points[l.from],b=points[l.to];return l.km>=.3&&<text key={`${l.from}-${l.to}`} x={(a.x+b.x)/2} y={(a.y+b.y)/2-4} className="dm-leg">{l.km<1?`${Math.round(l.km*1000)} m`:`${l.km.toFixed(1)} km`}</text>;})}
   {marks.map((m,i)=>{const p=points[i],label=m.stops.map(s=>s.n).join(',');const done=m.stops.every(s=>s.done);
    return <g key={i} className={`dm-mark${m.exact?'':' rough'}${done?' done':''}${open===i?' on':''}`} onClick={()=>setOpen(open===i?null:i)} role="button" tabIndex={0} aria-label={`${label}: ${m.stops.map(s=>s.title).join(', ')}`} onKeyDown={e=>{if(e.key==='Enter')setOpen(open===i?null:i);}}>
     <circle cx={p.x} cy={p.y} r={label.length>2?14:11}/><text x={p.x} y={p.y+4}>{label.length>5?`${m.stops[0].n}+`:label}</text></g>;})}
   <g className="dm-north" transform={`translate(${W-22},26)`}><path d="M0,-12 L6,6 L0,2 L-6,6 Z"/><text y="18">N</text></g>
   <g className="dm-scale" transform={`translate(14,${H-16})`}><line x2={bar.px}/><text y="-5">{bar.label}</text></g>
  </svg>
  {chosen&&<ul className="dm-stops">{chosen.stops.map(s=><li key={s.id}><button type="button" onClick={()=>{const step=state.steps.find(x=>x.id===s.id);if(step)selectStep(step);}}><b>{s.n}</b>{s.time&&<span>{s.time}</span>}{s.title}</button></li>)}{!chosen.exact&&<li><small>Roughly here: our map has no pin for it, so it is placed in its neighbourhood.</small></li>}</ul>}
  {rough>0&&!chosen&&<p><small>Dashed rings are placed in their neighbourhood, not at the door. A sketch, not a street map: use Maps for the way there.</small></p>}
 </details>;
}
