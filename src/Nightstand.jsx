import React,{useEffect,useState} from 'react';
import {Moon,Sun,AlarmClock,Clock} from 'lucide-react';
import {japanClock,japanDate} from './timing.js';
import {nextSummary} from './trip-features.js';
import {forecastFor,describe} from './weather-data.js';
import {dayLabel} from './AdventurePages.jsx';
// The phone on the hotel nightstand. Big clock, tomorrow's first fixed time and when to leave
// for it, the forecast, and the alarm that follows from them. The screen stays awake and goes
// dim after ten; a tap brightens it. Nothing here is tapped on in the dark except that.
export const alarmFor=departure=>departure?new Date(departure.getTime()-60*60000):null;
export default function Nightstand({state,now,go}){
 const [tick,setTick]=useState(now||new Date()),[bright,setBright]=useState(false);
 useEffect(()=>{const id=setInterval(()=>setTick(new Date()),15000);return()=>clearInterval(id);},[]);
 useEffect(()=>{let lock=null;navigator.wakeLock?.request('screen').then(l=>{lock=l;}).catch(()=>{});return()=>{lock?.release().catch(()=>{});};},[]);
 const today=japanDate(tick),hour=Number(japanClock(tick).slice(0,2));
 const idx=state.days.findIndex(d=>d.date===today),tomorrow=idx>=0?state.days[idx+1]:null;
 const late=hour>=22||hour<6,dim=late&&!bright;
 const next=tomorrow?nextSummary(state,tomorrow.date):null,fixed=next?.fixed||null,departure=next?.departure||null,alarm=alarmFor(departure);
 const f=tomorrow?forecastFor(state,tomorrow.date):null,[sky]=f?describe(f.code):[null];
 return <section className={`nightstand${dim?' dim':''}`} onClick={()=>setBright(b=>!b)} aria-label="Nightstand">
  <p className="eyebrow">{dim?<Moon size={14}/>:<Sun size={14}/>} {dayLabel(today)} · JST</p>
  <strong className="nightstand-clock">{japanClock(tick)}</strong>
  {tomorrow
   ?<div className="nightstand-lines">
     <p><strong>Tomorrow</strong> · {tomorrow.city||''} · {tomorrow.title||''}</p>
     {fixed?<p><Clock size={16}/> First fixed time <strong>{fixed.time}</strong> {fixed.title}{departure&&<> · leave by <strong>{japanClock(departure)}</strong></>}</p>:<p>No fixed time tomorrow. A slow morning.</p>}
     {alarm&&<p><AlarmClock size={16}/> Alarm for <strong>{japanClock(alarm)}</strong>, an hour before leaving.</p>}
     {f&&<p>{sky}{Number.isFinite(f.max)?` · ${f.min}–${f.max}°`:''}{Number.isFinite(f.rain)?` · ${f.rain}% rain`:''}</p>}
    </div>
   :<div className="nightstand-lines"><p>{idx>=0?'Last night of the trip. Sleep well.':'Not on the trip tonight.'}</p></div>}
  <small>{dim?'Tap to brighten.':'Stays on while this is open. Dims after ten.'}</small>
  {go&&<button type="button" onClick={e=>{e.stopPropagation();go('today');}}>Back to Home</button>}
 </section>;
}
