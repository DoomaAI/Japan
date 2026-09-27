import React from 'react';
import {Plane} from 'lucide-react';
import {BORDER_LINKS,DUTY_FREE,DECLARE,DECLARE_RULE} from './going-home.js';
// Duty-free allowances and what to declare, for the flight home. Folded by default everywhere
// except where it is asked for, because it is a page of rules and only matters once.
export default function GoingHome({open=false}){
 return <details className="callout going-home" open={open}>
  <summary><Plane size={18}/> <strong>Coming home: duty-free and what to declare</strong></summary>
  <h3>Duty-free allowances</h3>
  <ul>{DUTY_FREE.map(d=><li key={d.id}><strong>{d.title}.</strong> {d.text}</li>)}</ul>
  <h3>Declare on the Incoming Passenger Card</h3>
  <ul>{DECLARE.map(d=><li key={d.id}><strong>{d.title}.</strong> {d.text}</li>)}</ul>
  <p><strong>{DECLARE_RULE}</strong></p>
  <p><small>Check before landing: {BORDER_LINKS.map(([label,href],i)=><React.Fragment key={href}>{i?' · ':''}<a href={href} target="_blank" rel="noopener noreferrer">{label}</a></React.Fragment>)}</small></p>
 </details>;
}
