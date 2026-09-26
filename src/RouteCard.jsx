import React,{useEffect,useRef,useState} from 'react';
import {Footprints,TrainFront,Radio,ExternalLink,LocateFixed,Square} from 'lucide-react';
import {LINES,legStops,stationLabel,whereOnRoute,liveTimes} from './route-data.js';
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
function Tracker({legs,rides,track}){
 const {on,setOn,fix,where,trouble}=track,[now,setNow]=useState(Date.now());
 useEffect(()=>{if(!on)return;const t=setInterval(()=>setNow(Date.now()),15000);return ()=>clearInterval(t);},[on]);
 const rideLegs=legs.filter(l=>l.mode==='ride'),leg=where&&rideLegs[where.i],stops=where&&rides[where.i];
 const age=fix?Math.round((now-fix.at)/60000):0;
 return <div className={`route-track${where?.ready?' ready':''}`} aria-live="polite">
  <button className={on?'is-on':''} aria-pressed={on} onClick={()=>setOn(!on)}>{on?<><Square size={15}/>Stop tracking</>:<><LocateFixed size={15}/>Track this ride</>}</button>
  {on&&!fix&&!trouble&&<span>Finding you…</span>}
  {trouble&&<span>{trouble}. Count the stops from the list instead.</span>}
  {on&&fix&&!where&&<span>Not near any station on this route yet.</span>}
  {on&&where&&<span><strong>{where.arrived?`At ${stationLabel(where.nearest)}`:where.ready?`Next stop: ${stationLabel(stops[stops.length-1])} — get ready`:`Near ${stationLabel(where.nearest)}`}</strong>{!where.arrived&&` · ${where.left} stop${where.left===1?'':'s'} to go on the ${LINES[leg.line].name}`}{where.arrived&&leg.exit?` · ${leg.exit}`:''}</span>}
  {on&&fix&&age>=2&&<small>Last position {age} min ago; underground the phone often loses it.</small>}
 </div>;
}
export default function RouteCard({legs}){
 const rides=legs.filter(l=>l.mode==='ride').map(legStops),track=useTracking(rides),where=track.on&&track.where;
 const rideAt=legs.map((l,k)=>legs.slice(0,k).filter(x=>x.mode==='ride').length);
 return <section className="route-card" aria-label="Route">
  <p className="eyebrow">ROUTE</p>
  {legs.map((leg,k)=>{
   if(leg.mode==='walk')return <p className="route-walk" key={k}><Footprints size={15}/><span>{leg.text}{leg.minutes?` About ${leg.minutes} min.`:''}</span></p>;
   const r=rideAt[k],line=LINES[leg.line],stops=rides[r],here=where&&where.i===r?where.index:-1;
   return <div className="route-ride" key={k}>
    <strong className="route-line"><TrainFront size={16}/>{line.name} <span lang="ja">{line.ja}</span></strong>
    <p>Board at <b>{stationLabel(stops[0])}</b>. Towards: {leg.towards}{/[.)]$/.test(leg.towards)?'':'.'}</p>
    <p>Get off at <b>{stationLabel(stops[stops.length-1])}</b> · {stops.length-1} stop{stops.length===2?'':'s'}{leg.minutes?` · about ${leg.minutes} min`:''}</p>
    <details open={here>=0||undefined}><summary>Every station</summary>
     <ol className="route-stops">{stops.map((s,n)=><li key={n} className={n===here?'here':n<here?'passed':''}><span>{s.name}</span>{s.code&&<code>{s.code}</code>}<span lang="ja">{s.ja}</span></li>)}</ol>
    </details>
    {leg.exit&&<p className="route-exit"><b>Exit:</b> {leg.exit}</p>}
    <div className="route-links"><a href={liveTimes(leg)} target="_blank" rel="noreferrer"><Radio size={14}/>Live times</a><a href={line.status} target="_blank" rel="noreferrer"><ExternalLink size={14}/>{line.operator} service status</a></div>
   </div>;
  })}
  {rides.length>0&&<Tracker legs={legs} rides={rides} track={track}/>}
 </section>;
}
