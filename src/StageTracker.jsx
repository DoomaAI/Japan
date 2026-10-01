import React,{useEffect,useState} from 'react';
import Mark from './Mark.jsx';
import {Check,LocateFixed} from 'lucide-react';
import {stagesFor,stageReached,stageFromPosition,stageWords} from './stage-data.js';
// Five dots on a line under the booking that cannot move. Tap a dot to reach it; tap the reached
// one to step back. Track uses the phone's position for the two ends only.
export default function StageTracker({state,step,user,mutate,busy,canTick}){
 const stages=stagesFor(state,step),done=step.status==='done',reached=done?stages.length:stageReached(state,step.id);
 const [track,setTrack]=useState(false),[trouble,setTrouble]=useState('');
 useEffect(()=>{
  if(!track||!navigator.geolocation)return;
  const id=navigator.geolocation.watchPosition(p=>{
   setTrouble('');const from=stageFromPosition(state,step,{lat:p.coords.latitude,lng:p.coords.longitude});
   if(from&&from>stageReached(state,step.id))mutate({type:'stageSet',id:step.id,reached:from,by:user.name});
  },()=>setTrouble('No position from the phone; tap the stages instead.'),{enableHighAccuracy:true,maximumAge:30000,timeout:30000});
  return ()=>navigator.geolocation.clearWatch(id);
 },[track,step.id,reached]);
 const set=n=>{if(!canTick||busy||done)return;mutate({type:'stageSet',id:step.id,reached:n===reached?n-1:n,by:user.name});};
 return <div className="stages" aria-label="How far along">
  <ol className="stage-line" style={{'--reached':reached,'--n':stages.length}}>
   {stages.map((s,i)=>{const on=i<reached,now=i===reached-1;return <li key={s.id} className={`${on?'is-on':''}${now?' is-now':''}`}>
    <button type="button" disabled={!canTick||busy||done} aria-pressed={on} aria-label={`${s.label}${on?', reached':''}`} onClick={()=>set(i+1)}>{on?<Check size={14} strokeWidth={3}/>:<Mark emoji={s.icon} size={16}/>}</button>
    <small>{s.label}</small>
   </li>;})}
  </ol>
  <div className="stage-foot"><span>{done?'There.':stageWords(stages,reached)}{stageState(state,step.id)}</span>
   {!done&&canTick&&<button type="button" className={`stage-track${track?' is-on':''}`} aria-pressed={track} onClick={()=>setTrack(t=>!t)}><LocateFixed size={13}/>{track?'Tracking':'Track'}</button>}</div>
  {trouble&&<small className="stage-trouble">{trouble}</small>}
 </div>;
}
const stageState=(state,id)=>{const s=state.stages?.[id];return s?.pending?' · waiting to sync':'';};
