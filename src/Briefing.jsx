import React from 'react';
import {ChevronRight,LockKeyhole,BedDouble,PlaneTakeoff,Smartphone,Clock} from 'lucide-react';
import {useStored} from './stored.js';
import {dayBriefing,briefingGreeting} from './briefing-data.js';
import {READINESS,readinessOf,lowest,answered,faceOf} from './readiness-data.js';
import {useState} from 'react';
// The morning briefing widget: the day read in one card, with a tap through to its stops.
// The phrase and the fun fact of the day are a widget of their own, TodaysJapan, just below.
export default function Briefing({state,day,today,clock,go,user,mutate,busy,open}){
 const [installed]=useStored('japan.apps.installed',{});
 // Readiness: the faces fold to one line once everyone has answered, and open again on a tap.
 const members=state.members||[],parent=user?.role==='parent',[changing,setChanging]=useState(false);
 const done=answered(state,day,members),low=lowest(state,day),asking=day===today&&(changing||(parent?done.length<members.length:!done.includes(user?.name)));
 const b=dayBriefing(state,day);if(!b)return null;
 const apps=b.apps.filter(a=>!installed[a.id]);
 const span=b.starts&&b.ends&&b.starts!==b.ends?`${b.starts}–${b.ends}`:b.starts||'';
 return <section className="briefing" aria-label="The day in brief">
  <div className="briefing-head"><p className="eyebrow">{briefingGreeting(day,today,clock)} · Day {b.dayNumber} of {b.total}</p>
   {b.weather&&<span className="briefing-sky" title={b.weather.sky}><span aria-hidden="true">{b.weather.icon}</span> {b.weather.max}°<small>/{b.weather.min}°</small>{b.weather.rain!=null&&b.weather.rain>=30&&<small> · {b.weather.rain}% rain</small>}</span>}</div>
  <button type="button" className="briefing-stops" onClick={()=>go('glance')}>
   <strong>{b.stops?`${b.stops} stop${b.stops===1?'':'s'}${span?` · ${span}`:''}`:'A free day'}</strong>
   <span>{b.done?`${b.done} done so far`:b.city}</span><ChevronRight size={18}/>
  </button>
  {day===today&&user&&<div className="readiness">
   {asking?<>
    <p className="readiness-ask">How is everyone this morning?</p>
    {members.filter(p=>parent||p===user.name).map(p=>{const mine=readinessOf(state,day,p),can=true;return <div key={p} className="readiness-row"><span>{p}</span><div role="radiogroup" aria-label={`${p}: one to five`}>{READINESS.map(r=><button type="button" key={r.level} role="radio" aria-checked={mine===r.level} aria-label={`${r.word}, ${r.level} of 5`} className={mine===r.level?'is-on':''} disabled={busy||!can} onClick={()=>mutate({type:'readinessSet',day,person:p,level:r.level})}>{r.face}</button>)}</div></div>;})}
    {!parent&&done.filter(p=>p!==user.name).length>0&&<p className="readiness-others">{done.filter(p=>p!==user.name).map(p=>`${p} ${faceOf(readinessOf(state,day,p))}`).join(' · ')}</p>}
    {changing&&<button type="button" className="linkish" onClick={()=>setChanging(false)}>Done</button>}
   </>:<button type="button" className="readiness-line" onClick={()=>setChanging(true)}>{members.map(p=><span key={p}>{p} {faceOf(readinessOf(state,day,p))}</span>)}</button>}
   {low&&<div className="readiness-low"><p><b>{low.person} is at {low.level} of 5</b>, so the easier version of today is ready before anyone needs it.</p><div className="row wrap"><button type="button" onClick={()=>open?.({type:'tired'})}>Take it easier</button>{parent&&<button type="button" onClick={()=>open?.({type:'reschedule'})}>Adjust the day</button>}</div></div>}
  </div>}
  {b.fixed.length>0&&<ul className="briefing-fixed">{b.fixed.map(f=><li key={f.id}><LockKeyhole size={14}/><b>{f.time}</b> {f.title}</li>)}</ul>}
  {(b.moving||b.last)&&<p className="briefing-note"><BedDouble size={15}/>{b.last?'Last day: everything comes home with us.':`Hotel move today, to ${b.hotel}.`}</p>}
  {b.clocks&&<button type="button" className="briefing-note briefing-link" onClick={()=>go('homefront')}><Clock size={15}/>{b.clocks.text}</button>}
  {b.declaration&&<button type="button" className="briefing-note briefing-link" onClick={()=>go('arrival')}><PlaneTakeoff size={15}/>Australia Travel Declaration: fill it in for each of us, within 72 hours of the flight home.</button>}
  {apps.map(a=><button type="button" key={a.id} className="briefing-note briefing-link" onClick={()=>go('apps')}><Smartphone size={15}/>{a.today?'Needed today':'Tomorrow'}: {a.name}. Not on this phone yet; set it up now.</button>)}
 </section>;
}
