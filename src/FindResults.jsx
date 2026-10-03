import React from 'react';
import {Search} from 'lucide-react';
import {findAnything} from './find-data.js';
// What is already on the phone, found as the Concierge's box is typed in: a stop, a hotel, a
// ticket, a phrase, a screen. It needs no signal, so it works in a tunnel, and a name is one tap
// from its answer before anything is asked. Anything longer is a question for the Concierge, or
// for the full search page one row further down.
export function findTarget(h,{go,selectStep,open,selectDay}){
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
export default function FindResults({state,user,query,choose,searchAll}){
 if(String(query||'').trim().length<2)return null;
 const hits=findAnything(state,query,user);
 return <ul className="find-results" aria-label="Found on this phone">
  {hits.map(h=><li key={`${h.kind}|${h.id}`}><button type="button" onClick={()=>choose(h)}><span className="tag">{h.kind}</span><strong>{h.title}</strong>{h.detail&&<small>{String(h.detail).slice(0,80)}</small>}</button></li>)}
  <li className="find-none"><button type="button" className="linkish" onClick={searchAll}><Search size={14}/>{hits.length?'Search everything, guide text included':'Nothing by that name. Search everything, guide text included'}</button></li>
 </ul>;
}
