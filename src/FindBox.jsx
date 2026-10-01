import React,{useState} from 'react';
import {Search,X} from 'lucide-react';
import {findAnything} from './find-data.js';
// The box at the top of Home: type a name, tap the answer. Everything is on the phone already,
// so it works in a tunnel; the full search page is one tap further for anything longer.
export default function FindBox({state,user,go,selectStep,open,selectDay}){
 const [q,setQ]=useState('');
 const hits=findAnything(state,q,user);
 function choose(h){
  setQ('');
  if(h.step)return selectStep(h.step);
  if(h.kind==='Phrase')return open({type:'phrase',day:null,phrase:h.phrase});
  if(h.kind==='Hotel')return selectDay?.(h.day);
  if(h.page)return go(h.page);
  if(h.document)return open(h.kind==='Memory'?{type:'media',initialSearch:h.title}:{type:'tickets',initialSearch:h.title});
  if(h.kind==='Shopping')return go('shopping');
  if(h.kind==='Shortlist')return go('shortlist');
  if(h.kind==='Planning')return go('planning');
  if(h.kind==='Challenge')return go('challenges');
  if(h.kind==='Location')return go('locations');
  if(h.day)return selectDay?.(h.day);
  go('search');
 }
 return <div className="find-box">
  <label className="find-input"><Search size={17}/><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Type anything: a stop, hotel, ticket, phrase…" aria-label="Find anything"/>
   {q&&<button type="button" className="icon" aria-label="Clear" onClick={()=>setQ('')}><X size={16}/></button>}</label>
  {q.trim().length>=2&&<ul className="find-results">
   {hits.map(h=><li key={`${h.kind}|${h.id}`}><button type="button" onClick={()=>choose(h)}><span className="tag">{h.kind}</span><strong>{h.title}</strong>{h.detail&&<small>{String(h.detail).slice(0,80)}</small>}</button></li>)}
   {!hits.length&&<li className="find-none">Nothing by that name. <button type="button" className="linkish" onClick={()=>go('search')}>Search everything, guide text included</button></li>}
  </ul>}
 </div>;
}
