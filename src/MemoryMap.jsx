import React,{useEffect,useMemo,useRef,useState,useCallback} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {Map as MapIcon,Users,LocateFixed,EyeOff,RefreshCw,Star,Camera,Mic,MapPinOff,Download} from 'lucide-react';
import {dayLabel} from './AdventurePages.jsx';
import {MascotBadge} from './Mascot.jsx';
import {memoryPoints,dayRoute,placeCoords,checkinAge,ageText,CHECKIN_HOURS,CHECKIN_PLACES} from './memory-map.js';
import {askPhoneWhereItIs} from './geo.js';
import {japanDate} from './timing.js';
const docUrl=d=>`/api/document?id=${encodeURIComponent(d.id)}`;
const photoUrl=p=>`/api/photo?id=${encodeURIComponent(p.id)}`;
const findUrl=f=>`/api/shortlist?id=${encodeURIComponent(f.id)}`;
const voiceUrl=v=>`/api/voice?id=${encodeURIComponent(v.id)}`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Japan, whole, for when there is nothing to fit the map around yet.
const JAPAN=[[31,129.5],[43.5,145.5]];
// Markers are drawn from counts and initials only, never from anything a person typed, and
// what little text there is goes through esc() on its way into the marker's HTML.
function markerIcon(point,selected){
 const label=point.kind==='find'?'¥':point.kind==='photo'||point.kind==='daily'?'◉':point.count||'✓';
 return L.divIcon({className:'',iconSize:[34,34],iconAnchor:[17,17],
  html:`<span class="mm-marker ${point.kind}${point.exact?'':' approx'}${selected?' selected':''}">${esc(label)}</span>`});
}
const personIcon=(name,old)=>L.divIcon({className:'',iconSize:[40,40],iconAnchor:[20,20],
 html:`<span class="mm-person${old?' old':''}">${esc(name.slice(0,1))}</span>`});
function Memory({point,state}){
 const {photos,voice,ratings,thoughts}=point;
 const names=[...new Set([...Object.keys(ratings),...Object.keys(thoughts)])];
 return <section className="feature-card mm-memory" aria-live="polite">
  <p className="eyebrow">{point.day?dayLabel(point.day):'Shop find'}{point.time?` · ${point.time}`:''}{point.exact?'':' · at the place, roughly'}</p>
  <h2>{point.title}</h2>
  {point.kind==='daily'&&<img className="mm-photo" src={photoUrl(point.daily)} alt={point.title} loading="lazy"/>}
  {point.kind==='find'&&<>{point.find.photo&&<img className="mm-photo" src={findUrl(point.find)} alt={point.title} loading="lazy"/>}
   <p>{point.find.shop||'A shop'}{point.find.price?` · ¥${point.find.price}`:''} · found by {point.find.addedBy}</p></>}
  {!!photos.length&&<div className="mm-photos">{photos.map(d=>d.type?.startsWith('video/')
   ?<video key={d.id} src={docUrl(d)} controls playsInline preload="none"/>
   :<a key={d.id} href={docUrl(d)} target="_blank" rel="noopener noreferrer"><img src={docUrl(d)} alt={d.title} loading="lazy"/></a>)}</div>}
  {names.map(n=><div className="mm-review" key={n}>
   <MascotBadge state={state} person={n} size={28}/>
   <div><strong>{n}</strong>{ratings[n]&&<span className="mm-stars" aria-label={`${ratings[n]} of 5 stars`}>{Array.from({length:5},(_,i)=><Star key={i} size={14} fill={i<ratings[n]?'currentColor':'none'}/>)}</span>}
    {thoughts[n]&&<p>{thoughts[n].text}</p>}</div>
  </div>)}
  {voice.map(v=><div className="mm-voice" key={v.id}><Mic size={15}/><span>{v.title||`${v.by}’s voice note`}</span><audio controls preload="none" src={voiceUrl(v)}/></div>)}
  {point.kind==='stop'&&!point.count&&<p><small>Done, with nothing kept from it yet.</small></p>}
 </section>;
}
// Where the family last said they were. Nobody is shared unless they tap; a share is rounded to
// about a hundred metres and is gone after three hours. For where somebody is right now, Find My
// does it properly and in the background, which no web app on an iPhone can.
function Family({user,checkins,setCheckins,request,notice}){
 const [working,setWorking]=useState(false);
 const mine=checkins.find(c=>c.name===user.name);
 async function share(){
  setWorking(true);
  try{const at=await askPhoneWhereItIs(CHECKIN_PLACES);setCheckins((await request('checkin',at)).checkins);notice('Shared with the family for the next three hours.');}
  catch(e){notice(e.message||'Your position could not be shared.');}
  finally{setWorking(false);}
 }
 async function stop(){
  setWorking(true);
  try{setCheckins((await request('checkin',{stop:true})).checkins);notice('Your position is no longer shared.');}
  catch(e){notice(e.message);}finally{setWorking(false);}
 }
 return <section className="feature-card mm-family">
  <h2><Users size={18}/> The family</h2>
  <div className="row wrap">
   <button className="primary" disabled={working} onClick={share}><LocateFixed size={16}/>{working?'Finding you…':mine?'Share where I am again':'Share where I am'}</button>
   {mine&&<button disabled={working} onClick={stop}><EyeOff size={16}/>Stop sharing</button>}
  </div>
  {checkins.length?<ul className="mm-checkins">{checkins.map(c=><li key={c.name}><strong>{c.name}</strong> · {ageText(checkinAge(c))}</li>)}</ul>
   :<p><small>Nobody has shared where they are in the last {CHECKIN_HOURS} hours.</small></p>}
  <p><small>Only when you tap. Rounded to about 100 m, and deleted after {CHECKIN_HOURS} hours. {user.role==='parent'?'The boys see where Mum and Dad are; only a parent sees where the boys are.':'You can see where Mum and Dad are.'} For where somebody is right now, use Find My.</small></p>
 </section>;
}
export default function MemoryMap({state,user,request,accept,notice,busy}){
 const today=japanDate(),tripDay=state.days.some(d=>d.date===today);
 const [day,setDay]=useState(tripDay?today:''),[person,setPerson]=useState(''),[showFamily,setShowFamily]=useState(true);
 const [selected,setSelected]=useState(null),[checkins,setCheckins]=useState([]),[loading,setLoading]=useState(false);
 const box=useRef(null),map=useRef(null),layers=useRef(null),fitted=useRef('');
 const {points,unplaced}=useMemo(()=>memoryPoints(state,{day:day||null,person:person||null}),[state,day,person]);
 const route=useMemo(()=>day?dayRoute(state,day):[],[state,day]);
 const coords=state.placeCoords||{},known=Object.keys(placeCoords(state)).length;
 const refreshCheckins=useCallback(()=>request('checkins').then(r=>setCheckins(r.checkins||[])).catch(()=>{}),[request]);
 useEffect(()=>{refreshCheckins();const t=setInterval(refreshCheckins,60000);return()=>clearInterval(t);},[refreshCheckins]);
 useEffect(()=>{
  const m=L.map(box.current,{zoomControl:true,attributionControl:true}).fitBounds(JAPAN);
  // OpenStreetMap asks for the page's origin as the referrer; the app sends none by default.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',
   attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'}).addTo(m);
  layers.current=L.layerGroup().addTo(m);map.current=m;
  return()=>{m.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  const m=map.current,g=layers.current;if(!m||!g)return;
  g.clearLayers();
  const bounds=[];
  if(route.length>1)L.polyline(route.map(r=>[r.at.lat,r.at.lng]),{color:'#28665a',weight:3,opacity:.6,dashArray:'6 6'}).addTo(g);
  for(const p of points){
   L.marker([p.lat,p.lng],{icon:markerIcon(p,selected===p.id),title:p.title,keyboard:true,zIndexOffset:selected===p.id?1000:0})
    .on('click',()=>setSelected(p.id)).addTo(g);
   bounds.push([p.lat,p.lng]);
  }
  for(const r of route)bounds.push([r.at.lat,r.at.lng]);
  if(showFamily)for(const c of checkins){
   L.marker([c.lat,c.lng],{icon:personIcon(c.name,checkinAge(c)>60),title:`${c.name} · ${ageText(checkinAge(c))}`,zIndexOffset:2000})
    .bindTooltip(`${esc(c.name)} · ${esc(ageText(checkinAge(c)))}`).addTo(g);
   bounds.push([c.lat,c.lng]);
  }
  // Refit when what is shown changes, not when a marker is tapped: tapping one should not move
  // the map out from under the finger that tapped it.
  const key=`${day}|${person}|${showFamily}|${bounds.length}`;
  if(bounds.length&&fitted.current!==key){m.fitBounds(bounds,{padding:[36,36],maxZoom:16});fitted.current=key;}
 },[points,route,checkins,showFamily,selected,day,person]);
 useEffect(()=>setSelected(null),[day,person]);
 async function loadCoordinates(){
  setLoading(true);
  try{const r=await request('map-coordinates',{});accept(r);notice(`${r.matched} places placed from our My Map.${r.unmatched?.length?` ${r.unmatched.length} pins did not match a place by name.`:''}`);}
  catch(e){notice(e.message);}finally{setLoading(false);}
 }
 const chosen=points.find(p=>p.id===selected);
 return <><p className="eyebrow">WHERE IT HAPPENED</p><h1>Memory map</h1>
 <p>Our photos, voice notes, stars and what we thought, on the map where they happened, and the family where they last said they were. Tap a marker to see what we kept from it.</p>
 <div className="document-filters"><div className="form-row">
  <label>Day<select value={day} onChange={e=>setDay(e.target.value)}><option value="">The whole trip</option>{state.days.map(d=><option key={d.date} value={d.date}>{dayLabel(d.date)} · {d.city}</option>)}</select></label>
  <label>Whose<select value={person} onChange={e=>setPerson(e.target.value)}><option value="">Everyone’s</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label>
 </div>
 <label className="checkline"><input type="checkbox" checked={showFamily} onChange={e=>setShowFamily(e.target.checked)}/>Show the family on the map</label></div>
 <div className="mm-map" ref={box} role="region" aria-label="Map of our memories"/>
 <p className="mm-legend"><span className="mm-key stop"/>A stop <span className="mm-key stop approx"/>At the place, roughly <span className="mm-key photo"/>Where a photo was taken <span className="mm-key find"/>A shop find{day&&route.length>1&&<> · the dashed line is the day in order</>}</p>
 {chosen?<Memory point={chosen} state={state}/>:<p><small>{points.length?`${points.length} ${points.length===1?'place':'places'} on the map.`:'Nothing on the map for this yet.'}</small></p>}
 {!!unplaced.length&&<section className="feature-card">
  <h2><MapPinOff size={18}/> Not on the map yet</h2>
  <p><small>These have memories but no position: no pin on the stop, and no coordinates for its place. {user.role==='parent'?'Drop a pin from the stop’s card, or load our places from the My Map below.':'Mum or Dad can put them on the map.'}</small></p>
  <ul>{unplaced.map(p=><li key={p.id}>{p.title} · {dayLabel(p.day)}{p.photos.length?<> · <Camera size={13}/> {p.photos.length}</>:null}{p.voice.length?<> · <Mic size={13}/> {p.voice.length}</>:null}</li>)}</ul>
 </section>}
 <Family user={user} checkins={checkins} setCheckins={setCheckins} request={request} notice={notice}/>
 {user.role==='parent'&&<section className="feature-card">
  <h2><MapIcon size={18}/> Our places</h2>
  <p><small>{known?`${known} of ${state.locations?.length||0} places have coordinates${coords.at?`, from our My Map on ${new Date(coords.at).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}`:''}.`:'Our places have addresses but no coordinates yet. The My Map has them: load them once, and every stop at one of those places goes on the map.'}</small></p>
  <button disabled={busy||loading} onClick={loadCoordinates}>{known?<RefreshCw size={16}/>:<Download size={16}/>}{loading?'Reading our My Map…':known?'Load them again':'Load coordinates from our My Map'}</button>
  <p><small>Reads the pins on the family My Map and matches them to our places by name. The map has to be shared so anyone with the link can view it.</small></p>
 </section>}
 <p><small>Map tiles come from OpenStreetMap, so the map itself needs a signal.</small></p>
 </>;
}
