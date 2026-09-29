import React,{useEffect,useRef,useState} from 'react';
import {Check,CheckCircle2,Footprints,TrainFront,TrainFrontTunnel,TramFront,Bus,Radio,ExternalLink,LocateFixed,Square,Eye,Ticket} from 'lucide-react';
import {LINES,legStops,stationLabel,whereOnRoute,liveTimes,routeFares,yen,lineSymbols,inkOn,legCount,legDone,legsTicked} from './route-data.js';
import {GEO_TROUBLE,GEO_UNKNOWN} from './geo.js';
// Follows the phone along the route while it is open and tracking is on. GPS fades underground,
// so the last good fix is kept and its age shown rather than guessing.
function useTracking(rides){
 const [on,setOn]=useState(false),[fix,setFix]=useState(null),[trouble,setTrouble]=useState(''),buzzed=useRef(new Set());
 useEffect(()=>{
  if(!on)return;
  if(!navigator.geolocation){setTrouble('This phone cannot share its position');setOn(false);return;}
  const id=navigator.geolocation.watchPosition(p=>{setTrouble('');setFix({lat:p.coords.latitude,lng:p.coords.longitude,at:Date.now()});},
   e=>setTrouble(GEO_TROUBLE[e?.code]||GEO_UNKNOWN),{enableHighAccuracy:true,maximumAge:10000,timeout:30000});
  return ()=>navigator.geolocation.clearWatch(id);
 },[on]);
 const where=fix&&whereOnRoute(rides,fix);
 useEffect(()=>{
  if(!where?.ready)return;
  const key=`${where.i}`;
  if(buzzed.current.has(key))return;
  buzzed.current.add(key);navigator.vibrate?.([200,100,200]);
 },[where?.i,where?.ready]);
 return {on,setOn,fix,where,trouble};
}
function Tracker({legs,rides,track,status,onPress}){
 const {on,setOn,fix,where,trouble}=track,[now,setNow]=useState(Date.now());
 useEffect(()=>{if(!on)return;const t=setInterval(()=>setNow(Date.now()),15000);return ()=>clearInterval(t);},[on]);
 const rideLegs=legs.filter(l=>l.mode==='ride'),leg=where&&rideLegs[where.i],stops=where&&rides[where.i];
 const age=fix?Math.round((now-fix.at)/60000):0;
 return <>
 <button className={`route-track-toggle${on?' is-on':''}`} aria-pressed={on} onClick={()=>{onPress();setOn(!on);}}>{on?<><Square size={14}/>Stop tracking</>:<><LocateFixed size={14}/>Track this ride</>}</button>
 {status&&<div className={`route-track${where?.ready?' ready':''}`} aria-live="polite">
  {on&&!fix&&!trouble&&<span>Finding you…</span>}
  {trouble&&<span>{trouble}. Count the stops from the list instead.</span>}
  {on&&fix&&!where&&<span>Not near any {rideLegs.some(l=>LINES[l.line].kind!=='Bus')?'station':'stop'} on this route yet.</span>}
  {on&&where&&(where.arrived
   ?<p className="route-now"><strong>At {stationLabel(where.nearest)}. Get off here.</strong>{leg.exit&&<span>{leg.exit}</span>}</p>
   :<p className="route-now"><small>{where.at?'Next stop':'Approaching'}{where.next===stops.length-1?' · get off here':''}</small><strong>{stationLabel(where.upcoming)}</strong><span>{where.at?`Now at ${stationLabel(where.nearest)} · `:''}{where.togo} stop{where.togo===1?'':'s'} to {stationLabel(stops[stops.length-1])} on the {LINES[leg.line].name}</span></p>)}
  {on&&fix&&age>=2&&<small>Last position {age} min ago; underground the phone often loses it.</small>}
 </div>}
 </>;
}
// Subway symbols are round on the signs; JR and private railways use a rounded square.
function LineSymbol({code,line}){
 return <b className={`line-symbol${line.kind==='Subway'?' round':''}`} style={{background:line.colour,color:inkOn(line.colour)}} aria-hidden="true">{code}</b>;
}
const KIND_ICON={Subway:TrainFrontTunnel,Bus,Monorail:TramFront};
// The tick beside one leg. Whoever may tick the stop may tick its legs; everyone else still sees
// which legs are behind the family. The mark is the same circle as a stop's on the day at a glance,
// with the checkbox laid invisibly over the whole label so the finger target stays generous.
function LegTick({step,k,label,canTick,busy,onTick}){
 const done=legDone(step,k);
 return <label className={`route-leg-tick${done?' is-done':''}`}><input type="checkbox" checked={done} disabled={busy||!canTick} aria-label={`${done?'Done':'Mark done'}: leg ${k+1}, ${label}`} onChange={e=>onTick(k,e.target.checked)}/><span className="route-leg-dot" aria-hidden="true">{done&&<Check size={10} strokeWidth={3}/>}</span><span>{done?'Done':'Done?'}</span></label>;
}
export default function RouteCard({legs,step,canTick,busy,onTick}){
 const rides=legs.filter(l=>l.mode==='ride').map(legStops),track=useTracking(rides),where=track.on&&track.where;
 const fares=routeFares(legs),rideAt=legs.map((l,k)=>legs.slice(0,k).filter(x=>x.mode==='ride').length);
 // Every ride offers the one tracker; its status sits with the ride it is following (the one pressed until it knows).
 const [pressed,setPressed]=useState(0),trackAt=where?where.i:pressed;
 const ticks=step&&onTick?legCount(step):0,tick=(k,label)=>ticks?<LegTick step={step} k={k} label={label} canTick={canTick} busy={busy} onTick={onTick}/>:null,doneClass=k=>ticks>0&&legDone(step,k)?' leg-done':'';
 return <section className="route-card" aria-label="Route">
  <p className="eyebrow">ROUTE</p>
  {ticks>0&&<p className="route-progress"><CheckCircle2 size={15}/><span><b>{legsTicked(step)} of {ticks} legs done.</b> {step.status==='done'?'This stop is complete.':'Tick each leg as you finish it; the last one ticks off the whole stop.'}</span></p>}
  {fares&&<p className="route-fares"><Ticket size={15}/><span><b>Fare: adult {yen(fares.adult)} · child {yen(fares.child)} each,</b> as {fares.rides.length} separate tickets, one per company: {fares.rides.map(r=>`${r.operator} ${yen(r.yen[0])} / ${yen(r.yen[1])}`).join(' + ')}. An IC card covers them all: tap out at one company's gates and in again at the next, and each part is charged.{legs.some(l=>l.options)?' Seat tickets on the options below are extra.':''}</span></p>}
  {legs.map((leg,k)=>{
   if(leg.mode==='walk')return <p className={`route-walk${doneClass(k)}`} key={k}><Footprints size={15}/><span>{leg.text}{leg.minutes?` About ${leg.minutes} min.`:''}</span>{tick(k,'walk')}</p>;
   const r=rideAt[k],line=LINES[leg.line],stops=rides[r],on=where&&where.i===r,here=on?where.index:-1,next=on&&!where.arrived?where.next:-1;
   const Icon=KIND_ICON[line.kind]||TrainFront,fast=line.fast||[],symbols=lineSymbols(stops);
   return <div className={`route-ride${doneClass(k)}`} key={k} style={{'--line':line.colour}}>
    <div className="route-head"><strong className="route-line"><Icon size={16}/>{symbols.map(c=><LineSymbol key={c} code={c} line={line}/>)}{line.name} <span lang="ja">{line.ja}</span></strong>{tick(k,line.name)}</div>
    <p className="route-kind">{symbols.length===0&&<i aria-hidden="true"/>}{line.kind} · {line.operator}</p>
    <p>Board at <b>{stationLabel(stops[0])}</b>. Towards: {leg.towards}{/[.)]$/.test(leg.towards)?'':'.'}</p>
    <p>Get off at <b>{stationLabel(stops[stops.length-1])}</b> · {stops.length-1} stop{stops.length===2?'':'s'}{leg.minutes&&!leg.options?` · about ${leg.minutes} min`:''}</p>
    {leg.yen&&!leg.options&&<p className="route-fare"><b>Fare:</b> adult {yen(leg.yen[0])} · child {yen(leg.yen[1])}{fares?`, a separate ${line.operator} ticket`:''}. Tap an IC card at the gates, or buy a ticket from the fare machines.</p>}
    {leg.options&&<div className="route-options"><b>Options</b>{leg.options.map(o=><div key={o.name}><strong>{o.name} {o.ja&&<span lang="ja">{o.ja}</span>}<small>about {o.minutes} min</small></strong><span>{o.fare}</span><p>{o.how}</p></div>)}</div>}
    <p className="route-look"><Eye size={14}/><span><b>Look for:</b> {line.look}</span></p>
    <div className="route-follow">
     <details open={here>=0||undefined}><summary>{line.kind==='Bus'?'Stops':'Stations'}</summary>
      {fast.length>0&&<p className="route-fast">{line.allStop} trains stop at all of these. {fast.map(f=><span key={f.tag}><mark>{f.tag}</mark> marks where {/^[AEIOU]/.test(f.name)?'an':'a'} {f.name} stops{f.some?'; “some” means only some of them':''}. </span>)}</p>}
      <ol className="route-stops">{stops.map((s,n)=><li key={n} className={n===next?'next':n===here&&where.at?'here':n<(next>=0?next:here)?'passed':''}><span>{s.name}</span>{n===next&&<em>Next</em>}{s.code&&<code>{s.code}</code>}<span lang="ja">{s.ja}</span>{fast.map(f=>f.at.includes(s.name)?<mark key={f.tag}>{f.tag}</mark>:f.some?.includes(s.name)?<mark key={f.tag} className="some">{f.tag}, some</mark>:null)}</li>)}</ol>
     </details>
     <Tracker legs={legs} rides={rides} track={track} status={r===trackAt} onPress={()=>setPressed(r)}/>
    </div>
    <div className="route-links"><a href={liveTimes(leg)} target="_blank" rel="noreferrer"><Radio size={14}/>Live times</a><a href={line.status} target="_blank" rel="noreferrer"><ExternalLink size={14}/>{line.operator} service status</a></div>
    {leg.exit&&<p className="route-exit"><b>Exit:</b> {leg.exit}</p>}
   </div>;
  })}
 </section>;
}
