import React,{useState} from 'react';
import {Scale,CloudSun,Coins,Heart,ThumbsUp,CalendarDays,ChevronRight,AlertCircle,Home,Trees,Star} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import {forecastFor,describe} from './weather-data.js';
import {party,yenPerAud,yenToAud} from './trip-features.js';
import {PRIORITIES,PRIORITY_LEVELS,personPriorities,prioritiesSet,groupPriorities,decide,settingLabel} from './decide-data.js';
const ICON={weather:CloudSun,cost:Coins,likes:Heart,votes:ThumbsUp};
const pct=n=>`${Math.round(n*100)}%`;
// Choosing between the ideas for a day, together: the day's forecast, what each idea costs all
// of us, who it suits and how it has been voted, weighted by what each of us says matters. It
// decides nothing — it puts the ideas in order and shows why, and a parent puts one on the day.
export default function ChooseTogether({state,user,day,mutate,busy,onOpen}){
 const [date,setDate]=useState(day||state.days[0]?.date||''),[all,setAll]=useState(false),[who,setWho]=useState(user.name),[showAll,setShowAll]=useState(false);
 const parent=user.role==='parent',rate=yenPerAud(state),budget=party(state).budget;
 const weights=groupPriorities(state),mine=personPriorities(state,who),canSet=parent||who===user.name;
 const rows=decide(state,date,{all,weights}),shown=showAll?rows:rows.slice(0,5);
 const entry=forecastFor(state,date),d=state.days.find(x=>x.date===date);
 const said=state.members.filter(n=>prioritiesSet(state,n));
 const setLevel=(id,level)=>mutate({type:'partyPriorities',name:who,weights:{...mine,[id]:level}});
 return <details className="party-panel choose-panel">
  <summary><Scale size={17}/>Help us choose</summary>
  <p>Weighs up the ideas on the board for one day — the weather, what they cost all of us, who they suit and how we voted — by how much each of those matters to each of us.</p>
  <label>Day<select value={date} onChange={e=>setDate(e.target.value)}>{state.days.map(x=><option key={x.date} value={x.date}>{dayLabel(x.date)} · {x.city} · {x.title}</option>)}</select></label>
  <div className="segmented" role="group" aria-label="Which ideas">{[[false,'Hoped for this day, or any day'],[true,'Every idea up for a vote']].map(([key,label])=>
   <button type="button" key={String(key)} className={all===key?'selected':''} onClick={()=>setAll(key)}>{label}</button>)}</div>
  <div className="choose-day">
   {entry?<p><span aria-hidden="true">{describe(entry.code)[1]}</span> <strong>{describe(entry.code)[0]}</strong> in {d?.city} · {entry.min}–{entry.max}°{entry.rain!==null?` · ${entry.rain}% chance of rain`:''}</p>
    :<p><CloudSun size={16}/> No forecast for {dayLabel(date)} yet — it arrives about two weeks out. Until then the weather is left out of the sums.</p>}
   <p><Coins size={16}/> {budget?`About ¥${budget.toLocaleString()} a day for all of us (≈$${yenToAud(budget,rate).toFixed(0)})`:'No daily budget set — cost is compared between the ideas instead. A parent can set one under “Who we are”.'}</p>
  </div>
  <fieldset className="choose-weights"><legend>What matters when we choose</legend>
   <div className="choose-group">{PRIORITIES.map(([id,label])=>{const Icon=ICON[id];return <div className="choose-weight" key={id}>
    <span><Icon size={14}/>{label}</span><span className="choose-bar" aria-hidden="true"><i style={{width:`${weights[id]/3*100}%`}}/></span><small>{PRIORITY_LEVELS[Math.round(weights[id])][1]}</small>
   </div>;})}</div>
   <small>The average of all {state.members.length} of us.{said.length?` Set by ${said.join(', ')}`:' Nobody has said yet'}{said.length<state.members.length?`; the rest count as “Matters” on everything.`:'.'}</small>
   <div className="segmented" role="group" aria-label="Whose">{state.members.filter(n=>parent||n===user.name).map(n=>
    <button type="button" key={n} className={who===n?'selected':''} onClick={()=>setWho(n)}>{n===user.name?`${n} (you)`:n}</button>)}</div>
   {PRIORITIES.map(([id,label])=><div className="choose-set" key={id}>
    <span>{label}</span>
    <div className="segmented" role="group" aria-label={`How much ${label.toLowerCase()} matters to ${who}`}>{PRIORITY_LEVELS.map(([level,name])=>
     <button type="button" key={level} disabled={busy||!canSet} className={mine[id]===level?'selected':''} onClick={()=>setLevel(id,level)}>{name}</button>)}</div>
   </div>)}
   {prioritiesSet(state,who)&&canSet&&<button type="button" disabled={busy} onClick={()=>mutate({type:'partyPriorities',name:who,weights:null})}>Back to the default for {who}</button>}
  </fieldset>
  {!rows.length&&<p className="callout"><AlertCircle size={18}/>Nothing up for a vote {all?'at all':`for ${dayLabel(date)}`}. {all?'Add an idea to the board first.':'Try every idea up for a vote, or add one.'}</p>}
  {shown.map((r,i)=>{const p=r.proposal,S=r.setting.setting==='indoor'?Home:Trees,mineVote=(p.votes||{})[user.name];
   return <article className={`feature-card choose-card ${i===0&&r.match!==null?'top':''}`} key={p.id}>
    <div className="section-heading"><div><span className="eyebrow">{i===0?'Best fit':`#${i+1}`}</span><h4>{p.title}</h4></div>
     <span className="plan-score for" aria-label={r.match===null?'Nothing to weigh yet':`${pct(r.match)} match`}>{r.match===null?'—':pct(r.match)}</span></div>
    {p.place&&<p><small>{p.place}</small></p>}
    <ul className="choose-parts">{PRIORITIES.map(([id,label])=>{const part=r.parts[id],Icon=ICON[id];
     return <li key={id} className={part.score===null?'unknown':''}><Icon size={14} aria-label={label}/><span className="choose-bar" aria-hidden="true"><i style={{width:part.score===null?0:pct(part.score)}}/></span><small>{part.note}</small></li>;})}</ul>
    <div className="row wrap plan-tags">
     {r.setting.setting&&<span className="tag"><S size={12}/>{settingLabel(r.setting.setting)}{r.setting.said?'':' (by the look of it)'}</span>}
     {r.musts.map(n=><span className="tag must" key={n}><Star size={12}/>{n}’s must-do</span>)}
     {r.parts.likes.avoid?.length>0&&<span className="tag down">{r.parts.likes.avoid.join(', ')} would rather avoid something here</span>}
     {p.day&&p.day!==date&&<span className="tag">Hoped for {dayLabel(p.day)}</span>}
    </div>
    {r.better&&<p className="callout"><CloudSun size={16}/>Better on {dayLabel(r.better.date)}: {r.better.note}.</p>}
    <div className="row wrap">
     <button disabled={busy} className={mineVote===1?'selected':''} onClick={()=>mutate({type:'proposalVote',id:p.id,person:user.name,vote:mineVote===1?0:1})}><ThumbsUp size={16}/>{mineVote===1?'Backed':'Back it'}</button>
     {parent&&<button className="primary" disabled={busy} onClick={()=>mutate({type:'proposalSchedule',id:p.id,day:date,time:p.time||null,kind:p.timing==='fixed'?'fixed':'flexible',locked:p.timing==='fixed'})}><CalendarDays size={16}/>Put it on {dayLabel(date)}</button>}
     <button onClick={()=>onOpen?.(p)}>See it on the board <ChevronRight size={15}/></button>
    </div>
   </article>;})}
  {rows.length>5&&<button type="button" onClick={()=>setShowAll(!showAll)}>{showAll?'Show the top five':`Show all ${rows.length}`}</button>}
  {!!rows.length&&<small>A guide, not a verdict. Indoors or out is read from the card unless someone set it; a price marked “each” is counted for everyone it suits. Nothing is booked from here.</small>}
 </details>;
}
