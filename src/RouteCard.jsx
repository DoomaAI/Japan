import React,{useEffect,useRef,useState} from 'react';
import {Check,CheckCircle2,Footprints,TrainFront,TrainFrontTunnel,TramFront,Bus,Radio,ExternalLink,LocateFixed,Square,Eye,Ticket,Baby,ChevronDown,ArrowLeft,ArrowRight} from 'lucide-react';
import {LINES,legStops,stationLabel,whereOnRoute,liveTimes,routeFares,yen,lineSymbols,inkOn,symbolStyle,symbolColour,legCount,legDone,legsTicked,legToDo,legStrip} from './route-data.js';
import {swipeDelta,isControl,typesText,stepIndex} from './swipe.js';
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
// The line symbol as the operator draws it (see symbolStyle): a ring round a white centre, a
// colour-filled shape, or JR East's framed square with the code on a black tab.
function LineSymbol({code,line}){
 const style=symbolStyle(line),colour=symbolColour(line,code);
 if(style==='jre')return <b className="line-symbol jre" style={{borderColor:colour}} aria-hidden="true"><span>{code}</span></b>;
 const [kind,shape]=style.split(' ');
 return <b className={`line-symbol ${kind} ${shape}`} style={kind==='ring'?{borderColor:colour}:{background:colour,color:inkOn(colour)}} aria-hidden="true">{code}</b>;
}
const KIND_ICON={Subway:TrainFrontTunnel,Bus,Monorail:TramFront};
// The tick beside one leg. Whoever may tick the stop may tick its legs; everyone else still sees
// which legs are behind the family. The mark is the same circle as a stop's on the day at a glance,
// with the checkbox laid invisibly over the whole label so the finger target stays generous.
function LegTick({step,k,label,canTick,busy,onTick}){
 const done=legDone(step,k);
 return <label className={`route-leg-tick${done?' is-done':''}`}><input type="checkbox" checked={done} disabled={busy||!canTick} aria-label={`${done?'Done':'Mark done'}: leg ${k+1}, ${label}`} onChange={e=>onTick(k,e.target.checked)}/><span className="route-leg-dot" aria-hidden="true">{done&&<Check size={10} strokeWidth={3}/>}</span><span>{done?'Done':'Done?'}</span></label>;
}
// The strip along the top of a route of several legs: one segment per leg, coloured by its
// standing (done, now, to come) and marked under the leg on show. Tapping a segment turns to
// that leg, so a parent can look ahead at the change without swiping through the walk first.
const STATUS_WORD={done:'Done',now:'Now','to come':'To come'};
function LegStrip({legs,strip,go}){
 const n=strip.length,on=strip.find(l=>l.showing),done=strip.filter(l=>l.done).length;
 return <div className="route-legs">
  <div className="route-leg-strip" role="tablist" aria-label="Legs of this route">
   {strip.map(l=>{
    const leg=legs[l.k],Icon=l.mode==='walk'?Footprints:KIND_ICON[LINES[leg.line].kind]||TrainFront;
    return <button type="button" role="tab" key={l.k} id={`route-leg-tab-${l.k}`} aria-selected={l.showing} aria-controls="route-leg-page" aria-label={`Leg ${l.k+1} of ${n}: ${l.label}, ${STATUS_WORD[l.status].toLowerCase()}`}
     className={`route-leg-pip is-${l.status.replace(' ','-')}${l.showing?' is-showing':''}`} style={l.colour?{'--line':l.colour}:undefined} onClick={()=>go(l.k)}>
     <span className="route-leg-bar" aria-hidden="true"/><span className="route-leg-mark" aria-hidden="true">{l.done?<Check size={12} strokeWidth={3}/>:<Icon size={13}/>}</span>
    </button>;
   })}
  </div>
  <p className="route-leg-caption" aria-live="polite"><b>Leg {on.k+1} of {n} · {on.label}</b><span className={`route-leg-status is-${on.status.replace(' ','-')}`}>{STATUS_WORD[on.status]}</span><small>{done} of {n} done</small></p>
 </div>;
}
export default function RouteCard({legs,step,canTick,busy,onTick,lookOpen=false}){
 const rides=legs.filter(l=>l.mode==='ride').map(legStops),track=useTracking(rides),where=track.on&&track.where;
 const fares=routeFares(legs),priced=legs.some(l=>l.yen||l.options),rideAt=legs.map((l,k)=>legs.slice(0,k).filter(x=>x.mode==='ride').length);
 // Every ride offers the one tracker; its status sits with the ride it is following (the one pressed until it knows).
 const [pressed,setPressed]=useState(0),trackAt=where?where.i:pressed;
 // Tapping a line's name opens or closes what to look for to find it. Settings chooses how each
 // one starts; the lines tapped since are kept as the ones flipped from that.
 const [flipped,setFlipped]=useState(()=>new Set()),looking=k=>lookOpen!==flipped.has(k),toggleLook=k=>setFlipped(s=>{const n=new Set(s);n.has(k)?n.delete(k):n.add(k);return n;});
 const ticks=step&&onTick?legCount(step):0;
 // A route of several legs turns like a page, one leg at a time: a swipe, the arrows, a tap on
 // the strip, or an arrow key while the card has focus. It opens on the leg the family is up
 // to, ticking a leg off turns to the next, and a tracked ride pulls the card to where the
 // phone is. A drag that began on a button or the tick is a press, not a turn.
 const paged=legs.length>1,[index,setIndex]=useState(()=>legToDo(step,legs.length)),touch=useRef(null);
 const go=k=>setIndex(i=>stepIndex(i,k-i,legs.length)),move=d=>setIndex(i=>stepIndex(i,d,legs.length));
 useEffect(()=>{if(where&&where.i>=0){const k=legs.findIndex((l,j)=>l.mode==='ride'&&rideAt[j]===where.i);if(k>=0)setIndex(k);}},[where&&where.i]);
 const tick=(k,label)=>ticks?<LegTick step={step} k={k} label={label} canTick={canTick} busy={busy} onTick={(leg,done)=>{onTick(leg,done);if(done&&leg===index)move(1);}}/>:null,doneClass=k=>ticks>0&&legDone(step,k)?' leg-done':'';
 const renderLeg=(leg,k)=>{
   if(leg.mode==='walk')return <p className={`route-walk${doneClass(k)}`} key={k}><Footprints size={15}/><span>{leg.text}{leg.minutes?` About ${leg.minutes} min.`:''}</span>{tick(k,'walk')}</p>;
   const r=rideAt[k],line=LINES[leg.line],stops=rides[r],on=where&&where.i===r,here=on?where.index:-1,next=on&&!where.arrived?where.next:-1;
   const Icon=KIND_ICON[line.kind]||TrainFront,fast=line.fast||[],symbols=lineSymbols(stops);
   return <div className={`route-ride${doneClass(k)}`} key={k} style={{'--line':line.colour}}>
    <div className="route-head"><strong className="route-line"><button type="button" className="route-line-toggle" aria-expanded={looking(k)} aria-controls={`route-look-${k}`} onClick={()=>toggleLook(k)}><Icon size={16}/>{symbols.map(c=><LineSymbol key={c} code={c} line={line}/>)}{line.name} <span lang="ja">{line.ja}</span><ChevronDown size={15} className="route-line-chevron" aria-hidden="true"/></button></strong>{tick(k,line.name)}</div>
    {looking(k)&&<p className="route-look" id={`route-look-${k}`}><Eye size={14}/><span><b>Look for:</b> {line.look}</span></p>}
    <p className="route-kind">{symbols.length===0&&<i aria-hidden="true"/>}{line.kind} · {line.operator}</p>
    <p>Board at <b>{stationLabel(stops[0])}</b>. Towards: {leg.towards}{/[.)]$/.test(leg.towards)?'':'.'}</p>
    <p>Get off at <b>{stationLabel(stops[stops.length-1])}</b> · {stops.length-1} stop{stops.length===2?'':'s'}{leg.minutes&&!leg.options?` · about ${leg.minutes} min`:''}</p>
    {leg.yen&&!leg.options&&<p className="route-fare"><b>Fare:</b> adult {yen(leg.yen[0])} · child {yen(leg.yen[1])}{fares?`, a separate ${line.operator} ticket`:''}{leg.through?`, which also covers the ${LINES[legs[k+1]?.line]?.name||'next ride'} after it: change trains without going out through the gates`:''}. Tap an IC card at the gates, or buy a ticket from the fare machines.{line.childIc?` ${line.childIc}`:''}</p>}
    {leg.sameTicket&&<p className="route-fare"><b>Fare:</b> nothing more; the ticket or IC tap from the ride before covers this one. Stay inside the gates to change.</p>}
    {leg.booked&&<p className="route-fare"><b>Tickets:</b> {leg.booked}</p>}
    {leg.options&&<div className="route-options"><b>Options</b>{leg.options.map(o=><div key={o.name}><strong>{o.name} {o.ja&&<span lang="ja">{o.ja}</span>}<small>about {o.minutes} min</small></strong><span>{o.fare}</span><p>{o.how}</p></div>)}</div>}
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
 };
 return <section className="route-card" aria-label="Route">
  <p className="eyebrow">ROUTE</p>
  {ticks>0&&<p className="route-progress"><CheckCircle2 size={15}/><span>{step.status==='done'?<><b>Every leg is done.</b> This stop is complete.</>:<><b>{legsTicked(step)} of {ticks} legs done.</b> Tick each leg as you finish it; the last one ticks off the whole stop.</>}</span></p>}
  {fares&&<p className="route-fares"><Ticket size={15}/><span><b>Fare: adult {yen(fares.adult)} · child {yen(fares.child)} each,</b> as {fares.rides.length} separate tickets, one per company: {fares.rides.map(r=>`${r.operator} ${yen(r.yen[0])} / ${yen(r.yen[1])}`).join(' + ')}. An IC card covers them all: tap out at one company's gates and in again at the next, and each part is charged.{legs.some(l=>l.options)?' Seat tickets on the options below are extra.':''}</span></p>}
  {priced&&<p className="route-fares"><Baby size={15}/><span><b>Under 6 (not yet at school): free.</b> Up to two ride free with each paying adult or child, no ticket; walk through the wide gate with a parent. Only a child aged 6 or over pays the child fare.</span></p>}
  {!paged&&legs.map(renderLeg)}
  {paged&&<>
   <LegStrip legs={legs} strip={legStrip(legs,step,index)} go={go}/>
   <div className="route-pager" id="route-leg-page" role="tabpanel" aria-labelledby={`route-leg-tab-${index}`} tabIndex={-1}
    onKeyDown={e=>{if(typesText(e.target))return;if(e.key==='ArrowLeft'){move(-1);e.preventDefault();}else if(e.key==='ArrowRight'){move(1);e.preventDefault();}}}
    onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
    onTouchEnd={e=>{
     const start=touch.current;touch.current=null;
     if(!start||isControl(e.target.tagName)||e.target.closest?.('a,button,label,summary'))return;
     move(swipeDelta(start,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY}));
    }}>
    <div className="route-leg-page" key={index}>{renderLeg(legs[index],index)}</div>
   </div>
   <div className="swipe-controls route-leg-controls">
    <button type="button" disabled={index<=0} onClick={()=>move(-1)}><ArrowLeft size={16}/> Back</button>
    <span>Swipe for the {index>=legs.length-1?'legs before':'next leg'}</span>
    <button type="button" disabled={index>=legs.length-1} onClick={()=>move(1)}>Next leg <ArrowRight size={16}/></button>
   </div>
  </>}
 </section>;
}
