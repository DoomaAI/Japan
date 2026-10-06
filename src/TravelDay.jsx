import React,{useEffect,useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {WinBurst} from './Win.jsx';
import {travelDay,travelDayKey} from './travel-day.js';
// The flight out and the flight home, marked on Home: a card with a plane crossing it all day,
// and the first time this phone opens Home that day, the paper and a buzz. Not a widget to put
// away, for the same reason the moment is not: two days in the whole trip, and both are the trip.
export default function TravelDay({days,today,go}){
 const t=travelDay(days,today),[burst,setBurst]=useState(false);
 useEffect(()=>{
  if(!t)return;
  const key=travelDayKey(t.date);
  try{if(localStorage.getItem(key))return;localStorage.setItem(key,'1');}catch{}
  setBurst(true);try{navigator.vibrate?.([80,50,80,50,160]);}catch{}
 },[t?.date]);
 if(!t)return null;
 return <>
  <button type="button" className={`travel-day ${t.kind}`} onClick={()=>go(t.page)}>
   <span className="travel-day-sky" aria-hidden="true"><i className="travel-day-trail"/><i className="travel-day-plane">✈️</i>{t.pieces.slice(1,6).map((p,i)=><i key={i} className="travel-day-bit" style={{left:`${10+i*18}%`,animationDelay:`${i*.7}s`}}>{p}</i>)}</span>
   <span className="travel-day-words"><b>{t.title}</b><small>{t.sub}</small><em>{t.action} <ChevronRight size={14}/></em></span>
  </button>
  <WinBurst on={burst} label={t.title} sub={t.kind==='out'?'Japan, here we come':'See you soon, Japan · またね'} pieces={t.pieces}/>
 </>;
}
