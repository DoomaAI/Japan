import React from 'react';
import {ChevronRight,LockKeyhole,BedDouble,PlaneTakeoff} from 'lucide-react';
import {dayBriefing,briefingGreeting} from './briefing-data.js';
// The morning briefing widget: the day read in one card, with a tap through to its stops.
export default function Briefing({state,day,today,clock,go}){
 const b=dayBriefing(state,day);if(!b)return null;
 const span=b.starts&&b.ends&&b.starts!==b.ends?`${b.starts}–${b.ends}`:b.starts||'';
 return <section className="briefing" aria-label="The day in brief">
  <div className="briefing-head"><p className="eyebrow">{briefingGreeting(day,today,clock)} · Day {b.dayNumber} of {b.total}</p>
   {b.weather&&<span className="briefing-sky" title={b.weather.sky}><span aria-hidden="true">{b.weather.icon}</span> {b.weather.max}°<small>/{b.weather.min}°</small>{b.weather.rain!=null&&b.weather.rain>=30&&<small> · {b.weather.rain}% rain</small>}</span>}</div>
  <button type="button" className="briefing-stops" onClick={()=>go('glance')}>
   <strong>{b.stops?`${b.stops} stop${b.stops===1?'':'s'}${span?` · ${span}`:''}`:'A free day'}</strong>
   <span>{b.done?`${b.done} done so far`:b.city}</span><ChevronRight size={18}/>
  </button>
  {b.fixed.length>0&&<ul className="briefing-fixed">{b.fixed.map(f=><li key={f.id}><LockKeyhole size={14}/><b>{f.time}</b> {f.title}</li>)}</ul>}
  {(b.moving||b.last)&&<p className="briefing-note"><BedDouble size={15}/>{b.last?'Last day: everything comes home with us.':`Hotel move today, to ${b.hotel}.`}</p>}
  {b.declaration&&<button type="button" className="briefing-note briefing-link" onClick={()=>go('arrival')}><PlaneTakeoff size={15}/>Australia Travel Declaration: fill it in for each of us, within 72 hours of the flight home.</button>}
  {b.phrase&&<button type="button" className="briefing-phrase" onClick={()=>go('phrases')}><span aria-hidden="true">{b.phrase.icon}</span><span><b>{b.phrase.en} · <span lang="ja">{b.phrase.ja}</span></b><small>Today’s phrase · say “{b.phrase.say}”</small></span><ChevronRight size={16}/></button>}
 </section>;
}
