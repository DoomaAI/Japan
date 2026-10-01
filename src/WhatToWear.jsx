import React from 'react';
import {ChevronDown,ExternalLink,Shirt} from 'lucide-react';
import {whatToWear} from './wear-data.js';
import Mark from './Mark.jsx';
// What to wear today, folded to its headline in the day in brief: layers and when the day turns,
// the shoes the walking asks for, and the stops with rules of their own.
export default function WhatToWear({state,day}){
 const w=whatToWear(state,day);
 if(!w)return null;
 const lines=[...w.weather,w.shoes];
 return <details className="what-to-wear">
  <summary><Shirt size={15}/><span><b>What to wear:</b> {w.headline}</span><ChevronDown size={16}/></summary>
  <ul>{lines.map(l=><li key={l.id}><Mark emoji={l.icon}/><span>{l.text}</span></li>)}</ul>
  {w.stops.length>0&&<><p className="what-to-wear-head">At today’s stops</p>
   <ul>{w.stops.map(r=><li key={r.id}><Mark emoji={r.icon}/><span>{r.stops.length?<b>{r.stops.join(', ')}. </b>:null}{r.text}{r.source&&<> <a href={r.source} target="_blank" rel="noopener noreferrer">Source <ExternalLink size={11}/></a></>}</span></li>)}</ul></>}
  <small>{w.arc?.hourly?'From the hourly forecast for the hours we are out.':w.arc?'From the day’s forecast; the hourly one is closer to the day.':''}</small>
 </details>;
}
