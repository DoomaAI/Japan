import React from 'react';
import {ChevronRight,ChevronDown,ChevronUp,X,LockKeyhole,BedDouble,PlaneTakeoff,Smartphone,Clock,ShieldAlert,Frown,Annoyed,Meh,Smile,Laugh} from 'lucide-react';
import {openNotes} from './day-check.js';
import WhatToWear from './WhatToWear.jsx';
import {rollFor} from './film-data.js';
import {readingBumps,dismissBump} from './level-nudge.js';
import {useStored} from './stored.js';
import {settingOn} from './settings.js';
import {dayBriefing,briefingGreeting} from './briefing-data.js';
import {READINESS,readinessOf,lowest,answered,faceOf,wordOf} from './readiness-data.js';
// The line face for each level, one to five, for the grown-ups' washi look in place of the emoji.
const LINE_FACE={1:Frown,2:Annoyed,3:Meh,4:Smile,5:Laugh};
const LineFace=({level})=>{const I=LINE_FACE[level];return I?<span className="readiness-line-icon" aria-hidden="true"><I size={20} strokeWidth={1.6}/></span>:null;};
// How someone said they are, as the face and the line icon; the look decides which shows.
const Feeling=({level})=>level?<span className="feeling" role="img" aria-label={wordOf(level)} title={wordOf(level)}><span className="readiness-face" aria-hidden="true">{faceOf(level)}</span><LineFace level={level}/></span>:null;
import {useState} from 'react';
// The morning briefing widget: the day read in one card, with a tap through to its stops.
// The phrase and the fun fact of the day are Home cards of their own, TodaysPhrase and TodaysFact, just below.
// Once read, it can be folded to its first two lines (and stays folded on this phone until
// opened again), or put away for the day, leaving one slim line to bring it back; tomorrow's
// briefing comes back open on its own.
export default function Briefing({state,day,today,clock,go,user,mutate,busy}){
 const [installed]=useStored('japan.apps.installed',{});
 const [folded,setFolded]=useStored('japan.briefing.folded',false),[putAway,setPutAway]=useStored('japan.briefing.dismissed','');
 const parent=user?.role==='parent';
 const b=dayBriefing(state,day);if(!b)return null;
 const apps=b.apps.filter(a=>!installed[a.id]);
 const span=b.starts&&b.ends&&b.starts!==b.ends?`${b.starts}–${b.ends}`:b.starts||'';
 if(putAway===day)return <button type="button" className="briefing-restore" onClick={()=>setPutAway('')}><ChevronDown size={15}/>Show the day in brief · Day {b.dayNumber} of {b.total}</button>;
 const head=<div className="briefing-head"><p className="eyebrow">{briefingGreeting(day,today,clock)} · Day {b.dayNumber} of {b.total}</p>
   {b.weather&&<span className="briefing-sky" title={b.weather.sky}><span aria-hidden="true">{b.weather.icon}</span> {b.weather.max}°<small>/{b.weather.min}°</small>{b.weather.rain!=null&&b.weather.rain>=30&&<small> · {b.weather.rain}% rain</small>}</span>}
   <span className="briefing-tools">
    <button type="button" className="icon" aria-expanded={!folded} aria-label={folded?'Open the day in brief':'Fold the day in brief'} onClick={()=>setFolded(f=>!f)}>{folded?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button>
    <button type="button" className="icon" aria-label="Put the day in brief away for today" onClick={()=>setPutAway(day)}><X size={18}/></button>
   </span></div>;
 const stops=<button type="button" className="briefing-stops" onClick={()=>go('glance')}>
   <strong>{b.stops?`${b.stops} stop${b.stops===1?'':'s'}${span?` · ${span}`:''}`:'A free day'}</strong>
   <span>{b.done?`${b.done} done so far`:b.city}</span><ChevronRight size={18}/>
  </button>;
 if(folded)return <section className="briefing folded" aria-label="The day in brief">{head}{stops}</section>;
 return <section className="briefing" aria-label="The day in brief">
  {head}
  {stops}
  <WhatToWear state={state} day={day}/>
  {/* A boy reading the kana: the offer to move his reading dial up, for a parent to take or leave. */}
  {parent&&day===today&&<ReadingBumps state={state} today={today} mutate={mutate} busy={busy}/>}
  {b.fixed.length>0&&<ul className="briefing-fixed">{b.fixed.map(f=><li key={f.id}><LockKeyhole size={14}/><b>{f.time}</b> {f.title}</li>)}</ul>}
  {/* Last night's film, developed at seven: the roll is in. */}
  {day===today&&rollFor(state,today).length>0&&<button type="button" className="briefing-note briefing-link" onClick={()=>go('photos')}><span aria-hidden="true">🎞️</span>Last night’s roll is in: {rollFor(state,today).length} photo{rollFor(state,today).length===1?'':'s'} from the film.</button>}
  {/* What the night-before check found and nobody has dealt with yet, one tap from the notes. */}
  {openNotes(state,day).length>0&&<button type="button" className="briefing-note briefing-link" onClick={()=>go('glance')}><ShieldAlert size={15}/>Checked the night before: {openNotes(state,day)[0].title}{openNotes(state,day).length>1?`, and ${openNotes(state,day).length-1} more`:''}.</button>}
  {(b.moving||b.last)&&<p className="briefing-note"><BedDouble size={15}/>{b.last?'Last day: everything comes home with us.':`Hotel move today, to ${b.hotel}.`}</p>}
  {b.clocks&&<button type="button" className="briefing-note briefing-link" onClick={()=>go('homefront')}><Clock size={15}/>{b.clocks.text}</button>}
  {b.declaration&&<button type="button" className="briefing-note briefing-link" onClick={()=>go('arrival')}><PlaneTakeoff size={15}/>Australia Travel Declaration: fill it in for each of us, within 72 hours of the flight home.</button>}
  {apps.map(a=><button type="button" key={a.id} className="briefing-note briefing-link" onClick={()=>go('help')}><Smartphone size={15}/>{a.today?'Needed today':'Tomorrow'}: {a.name}. Not on this phone yet; set it up now.</button>)}
 </section>;
}
// How is everyone this morning: one to five each, asked at breakfast. It sits on Home just above
// Before we head out, the other thing done before leaving the hotel, rather than in the day in brief.
// The faces fold to one line once everyone has answered, and open again on a tap.
// It is a breakfast question, so it goes once the first stop is done; it can be folded for
// the day (on this phone), or turned off altogether in Settings.
export function Readiness({state,day,today,user,mutate,busy,open,settings,change}){
 const [minimised,setMinimised]=useStored('japan.readiness.folded','');
 const members=state.members||[],parent=user?.role==='parent',[changing,setChanging]=useState(false);
 const done=answered(state,day,members),low=lowest(state,day),asking=day===today&&(changing||(parent?done.length<members.length:!done.includes(user?.name)));
 const b=dayBriefing(state,day);if(!b)return null;
 const morning=day===today&&user&&!b.done&&settingOn(settings,'morningCheck');
 if(!morning)return null;
 return <div className="readiness-home">
  {minimised===day&&<button type="button" className="readiness-restore" onClick={()=>setMinimised('')}><ChevronDown size={15}/>How is everyone this morning?</button>}
  {minimised!==day&&<div className="readiness">
   <div className="readiness-tools">
    <button type="button" className="icon" aria-label="Fold how is everyone for today" onClick={()=>{setMinimised(day);setChanging(false);}}><ChevronUp size={16}/></button>
    {change&&<button type="button" className="linkish" onClick={()=>change('morningCheck',false)}>Turn off</button>}
   </div>
   {asking?<>
    <p className="readiness-ask">How is everyone this morning?</p>
    {members.filter(p=>parent||p===user.name).map(p=>{const mine=readinessOf(state,day,p),can=true;return <div key={p} className="readiness-row"><span>{p}</span><div role="radiogroup" aria-label={`${p}: one to five`}>{READINESS.map(r=><button type="button" key={r.level} role="radio" aria-checked={mine===r.level} aria-label={`${r.word}, ${r.level} of 5`} className={mine===r.level?'is-on':''} disabled={busy||!can} onClick={()=>mutate({type:'readinessSet',day,person:p,level:r.level})}><span className="readiness-face" aria-hidden="true">{r.face}</span><LineFace level={r.level}/></button>)}</div></div>;})}
    {!parent&&done.filter(p=>p!==user.name).length>0&&<p className="readiness-others">{done.filter(p=>p!==user.name).map((p,i)=><React.Fragment key={p}>{i>0&&' · '}{p} <Feeling level={readinessOf(state,day,p)}/></React.Fragment>)}</p>}
    {changing&&<button type="button" className="linkish" onClick={()=>setChanging(false)}>Done</button>}
   </>:<button type="button" className="readiness-line" onClick={()=>setChanging(true)}>{members.map(p=><span key={p}>{p} <Feeling level={readinessOf(state,day,p)}/></span>)}</button>}
   {low&&<div className="readiness-low"><p><b>{low.person} is at {low.level} of 5</b>, so the easier version of today is ready before anyone needs it.</p><div className="row wrap"><button type="button" onClick={()=>open?.({type:'tired'})}>Take it easier</button>{parent&&<button type="button" onClick={()=>open?.({type:'reschedule'})}>Adjust the day</button>}</div></div>}
  </div>}
 </div>;
}
function ReadingBumps({state,today,mutate,busy}){
 const [,redraw]=useState(0);
 const bumps=readingBumps(state,today);
 if(!bumps.length)return null;
 return bumps.map(b=><div className="briefing-bump" key={b.name}>
  <p><b>{b.name} has solved the last three katakana puzzles.</b> Move his reading from {b.fromLabel} to {b.toLabel}?</p>
  <div className="row wrap"><button type="button" className="primary" disabled={busy} onClick={()=>mutate({type:'childLevels',name:b.name,reading:b.to})}>Move it up</button>
   <button type="button" onClick={()=>{dismissBump(b.name,b.from);redraw(n=>n+1);}}>Not yet</button></div>
 </div>);
}
