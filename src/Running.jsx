import React from 'react';
import {TrainFront,Plane,ExternalLink} from 'lucide-react';
import {InBar} from './home-bar.js';
import {runningToday} from './running-data.js';
// The Home widget: one tap per train company we ride today, and flight status on a flight day.
// Says nothing on a day with no trains and no flight.
export default function Running({state,day}){
 const {operators,flights}=runningToday(state,day);
 if(!operators.length&&!flights.length)return null;
 return <section className="running" aria-label="Is everything running?">
  <InBar fallback={<h3>Is everything running?</h3>}/>
  <ul>
   {operators.map(o=><li key={o.operator}><a href={o.status} target="_blank" rel="noopener noreferrer"><TrainFront size={16}/><span><strong>{o.operator}</strong><small>{o.lines.join(' · ')}</small></span><ExternalLink size={14}/></a></li>)}
   {flights.flatMap(f=>f.links.map(([label,href])=><li key={href}><a href={href} target="_blank" rel="noopener noreferrer"><Plane size={16}/><span><strong>{label}</strong><small>{f.step.title}{f.step.time?` · ${f.step.time}`:''}</small></span><ExternalLink size={14}/></a></li>))}
  </ul>
  <p><small>Delays and suspensions are posted by each company. Google Maps also shows them on a route.</small></p>
 </section>;
}
