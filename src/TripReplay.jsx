import React,{useEffect,useMemo,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {Play,Pause,RotateCcw,X,FastForward,Volume2,VolumeX} from 'lucide-react';
import {replayFrames,kmBetween,frameSound} from './memory-map.js';
import {createMixer,voiceUrl} from './sound-mix.js';
import {photoOfTheDay} from './trip-features.js';
import {dayLabel} from './AdventurePages.jsx';
const photoUrl=p=>`/api/photo?id=${encodeURIComponent(p.id)}`;
const JAPAN=[[31,129.5],[43.5,145.5]];
// Replay the trip: the whole journey drawn stop by stop over the map, the day and the stop
// along the bottom, and the day's photo of the day as each new day begins. A long hop — a
// Shinkansen, a flight — pulls out to show the country before closing in again.
export default function TripReplay({state,close}){
 const {frames,plan}=useMemo(()=>replayFrames(state),[state]);
 const [at,setAt]=useState(0),[playing,setPlaying]=useState(true),[fast,setFast]=useState(false);
 const box=useRef(null),map=useRef(null),line=useRef(null),dot=useRef(null);
 // A sound postcard plays as the replay passes the stop it was recorded at (the station melody as
 // the Shinkansen goes by). Only while it is playing, and off with one tap.
 const mixer=useRef(null),[sound,setSound]=useState(true);
 useEffect(()=>()=>mixer.current?.close(),[]);
 useEffect(()=>{
  if(!playing||!sound)return;const v=frameSound(state,frames[at]);if(!v)return;
  mixer.current??=createMixer();mixer.current?.play(voiceUrl(v.id));
 },[at,playing,sound]);
 useEffect(()=>{if(!playing||!sound)mixer.current?.stopAll();},[playing,sound]);
 useEffect(()=>{
  const m=L.map(box.current,{zoomControl:false,attributionControl:true}).fitBounds(JAPAN);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',
   attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'}).addTo(m);
  line.current=L.polyline([],{color:'#da684f',weight:4,opacity:.85}).addTo(m);
  dot.current=L.circleMarker(JAPAN[0],{radius:9,color:'#fff',weight:3,fillColor:'#da684f',fillOpacity:1}).addTo(m);
  map.current=m;return()=>{m.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  const m=map.current,f=frames[at];if(!m||!f)return;
  line.current.setLatLngs(frames.slice(0,at+1).map(x=>[x.lat,x.lng]));dot.current.setLatLng([f.lat,f.lng]);
  const prev=frames[at-1],far=prev&&kmBetween(prev,f)>25;
  if(!prev)m.flyTo([f.lat,f.lng],12,{duration:1});
  else if(far)m.flyToBounds([[prev.lat,prev.lng],[f.lat,f.lng]],{padding:[60,60],duration:1.4});
  else m.panTo([f.lat,f.lng],{duration:.5});
 },[at,frames]);
 useEffect(()=>{
  if(!playing||at>=frames.length-1)return;
  const prev=frames[at],next=frames[at+1],far=prev&&next&&kmBetween(prev,next)>25;
  const t=setTimeout(()=>setAt(n=>n+1),(far?2200:1100)/(fast?2:1));
  return()=>clearTimeout(t);
 },[playing,at,fast,frames]);
 useEffect(()=>{const key=e=>{if(e.key==='Escape')close();};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[close]);
 const f=frames[at],best=f&&photoOfTheDay(state,f.day)?.winners?.[0],newDay=f&&(!frames[at-1]||frames[at-1].day!==f.day),end=at>=frames.length-1;
 return <div className="replay" role="dialog" aria-modal="true" aria-label="Replay the trip">
  <div ref={box} className="replay-map"/>
  <button type="button" className="replay-close icon" aria-label="Close the replay" onClick={close}><X/></button>
  <div className="replay-card">
   {!frames.length?<p>Nothing to replay yet. Tick off a stop and it will appear here.</p>:<>
    <div className="replay-caption">
     {best&&<img key={f.day} className={newDay?'fresh':''} src={photoUrl(best)} alt="Photo of the day"/>}
     <div><p className="eyebrow">Day {f.dayNumber} · {dayLabel(f.day)} · {f.city}{plan?' · the plan':''}</p>
      <strong>{f.titles.at(-1)}</strong>{frameSound(state,f)&&<small>🔊 {frameSound(state,f).title||'A sound from here'}</small>}{f.titles.length>1&&<small>and {f.titles.length-1} more here</small>}{!f.exact&&<small>Roughly here: our map has no pin for it</small>}</div>
    </div>
    <input type="range" min="0" max={frames.length-1} value={at} aria-label="Where in the trip" onChange={e=>{setAt(+e.target.value);setPlaying(false);}}/>
    <div className="row replay-controls">
     {end?<button type="button" className="primary" onClick={()=>{setAt(0);setPlaying(true);}}><RotateCcw size={17}/>Play again</button>
      :<button type="button" className="primary" onClick={()=>setPlaying(p=>!p)}>{playing?<><Pause size={17}/>Pause</>:<><Play size={17}/>Play</>}</button>}
     <button type="button" aria-pressed={fast} onClick={()=>setFast(v=>!v)}><FastForward size={17}/>{fast?'2×':'1×'}</button>
     <button type="button" aria-pressed={sound} aria-label={sound?'Turn the sound postcards off':'Turn the sound postcards on'} onClick={()=>setSound(v=>!v)}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>
     <span>{at+1} of {frames.length}</span>
    </div>
   </>}
  </div>
 </div>;
}
