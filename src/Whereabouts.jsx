import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {LocateFixed,EyeOff,Clock,Navigation,Crosshair,Users} from 'lucide-react';
import {checkinAge,ageText,kmBetween,CHECKIN_HOURS} from './memory-map.js';
import {kmText} from './checkin-data.js';
import {dayMap} from './day-map-data.js';
import {lateFor} from './late-data.js';
import {askPhoneWhereItIs} from './geo.js';
import {japanClock,japanDate} from './timing.js';
import {SHARE_FOR} from './live-share.js';
import {LateCards} from './LateNotice.jsx';
import {parentsOf} from './people.js';
// Where we are: the family on a real map, from what each phone last shared, with today's stops
// under them and this phone's own dot, which is never sent anywhere unless asked. Sharing is
// once, or for a while; running late is one button away, because "where are you?" and "we're
// late" are the same moment on a split day.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const JAPAN=[[31,129.5],[43.5,145.5]];
// A position more than half an hour old is drawn faded: it says where they were, not where they are.
const OLD_MIN=30;
const personIcon=(name,old,late)=>L.divIcon({className:'',iconSize:[40,40],iconAnchor:[20,20],
 html:`<span class="mm-person${old?' old':''}${late?' late':''}">${esc(name.slice(0,1))}</span>`});
const meIcon=()=>L.divIcon({className:'',iconSize:[22,22],iconAnchor:[11,11],html:'<span class="wa-me"></span>'});
const stopIcon=(label,done)=>L.divIcon({className:'',iconSize:[26,26],iconAnchor:[13,13],html:`<span class="wa-stop${done?' done':''}">${esc(label)}</span>`});
const walkTo=c=>`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}&travelmode=walking`;
export default function Whereabouts({state,user,day,now,request,mutate,busy,go,open,notice,live}){
 const [checkins,setCheckins]=useState([]),[me,setMe]=useState(null),[finding,setFinding]=useState(false),[working,setWorking]=useState(false);
 const box=useRef(null),map=useRef(null),layers=useRef(null),fitted=useRef('');
 const today=japanDate(now),shownDay=state.days.some(d=>d.date===today)?today:day;
 const {marks}=useMemo(()=>dayMap(state,shownDay),[state,shownDay]);
 const lateNames=useMemo(()=>new Set(lateFor(state,user.name,now).flatMap(n=>n.with)),[state,user.name,now]);
 const refresh=useCallback(()=>request('checkins').then(r=>setCheckins(r.checkins||[])).catch(()=>{}),[request]);
 // Every half minute while the page is open, and straight after this phone shares.
 useEffect(()=>{refresh();const t=setInterval(refresh,30000);return()=>clearInterval(t);},[refresh,live.last?.at]);
 useEffect(()=>{
  const m=L.map(box.current,{zoomControl:true,attributionControl:true}).fitBounds(JAPAN);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',
   attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'}).addTo(m);
  layers.current=L.layerGroup().addTo(m);map.current=m;
  return()=>{m.remove();map.current=null;};
 },[]);
 useEffect(()=>{
  const m=map.current,g=layers.current;if(!m||!g)return;
  g.clearLayers();
  const people=[],all=[];
  marks.forEach(mk=>{
   const label=mk.stops.length>1?`${mk.stops[0].n}+`:String(mk.stops[0].n);
   L.marker([mk.lat,mk.lng],{icon:stopIcon(label,mk.stops.every(s=>s.done)),title:mk.stops.map(s=>s.title).join(', '),keyboard:false})
    .bindTooltip(esc(mk.stops.map(s=>`${s.time?`${s.time} `:''}${s.title}`).join(' · '))).addTo(g);
   all.push([mk.lat,mk.lng]);
  });
  for(const c of checkins){
   const age=checkinAge(c,now);
   L.marker([c.lat,c.lng],{icon:personIcon(c.name,age>OLD_MIN,lateNames.has(c.name)),title:`${c.name} · ${ageText(age)}`,zIndexOffset:2000})
    .bindTooltip(`${esc(c.name)} · ${esc(ageText(age))}`).addTo(g);
   people.push([c.lat,c.lng]);
  }
  if(me){L.marker([me.lat,me.lng],{icon:meIcon(),title:'You',zIndexOffset:3000}).bindTooltip('You').addTo(g);people.push([me.lat,me.lng]);}
  // Fit the people when there are any — that is what the page is for — and the day's stops when
  // there are not. Only when who is on it changes, so a refresh does not yank the map about.
  const fit=people.length?people:all,key=`${checkins.map(c=>c.name).join()}|${!!me}|${fit.length}`;
  if(fit.length&&fitted.current!==key){m.fitBounds(fit,{padding:[48,48],maxZoom:16});fitted.current=key;}
 },[marks,checkins,me,lateNames,now]);
 async function findMe(){
  setFinding(true);
  try{setMe(await askPhoneWhereItIs(5));}catch(e){notice(`${e.message}.`);}finally{setFinding(false);}
 }
 async function shareOnce(){
  setWorking(true);
  try{setCheckins(await live.once());notice(`Shared with the family for the next ${CHECKIN_HOURS} hours.`);}catch(e){notice(e.message||'Your position could not be shared.');}finally{setWorking(false);}
 }
 async function stop(){
  setWorking(true);
  try{setCheckins(await live.stop());notice('Your position is no longer shared.');}catch(e){notice(e.message);}finally{setWorking(false);}
 }
 const centre=c=>map.current?.setView([c.lat,c.lng],16);
 const mine=checkins.find(c=>c.name===user.name),others=checkins.filter(c=>c.name!==user.name);
 const quiet=state.members.filter(n=>n!==user.name&&!checkins.some(c=>c.name===n));
 const parent=user.role==='parent';
 return <><p className="eyebrow">SHARE WHERE YOU ARE</p><h1>Where we are</h1>
  <p>The family on the map, where each phone last shared it, with today’s stops under them. Running behind? Tell the people waiting.</p>
  <LateCards state={state} user={user} now={now} mutate={mutate} busy={busy} go={go} open={open} live={null}/>
  <div className="row wrap"><button type="button" className="primary" onClick={()=>open({type:'latemsg'})}><Clock size={16}/>Tell the others we’re late</button></div>
  <div className="mm-map wa-map" ref={box} role="region" aria-label="Map of where the family is"/>
  <p className="mm-legend"><span className="mm-key wa-key-person"/>Family, by initial <span className="mm-key wa-key-late"/>Running late <span className="mm-key wa-key-me"/>You, on this phone only <span className="mm-key wa-key-stop"/>Today’s stops, in order</p>
  <section className="feature-card wa-share">
   <h2><LocateFixed size={18}/> Share where I am</h2>
   {live.until?<p><strong>Sharing until {japanClock(new Date(live.until))}</strong><br/><small>{live.last?`Last sent ${ageText(checkinAge(live.last,now))}. `:''}{live.trouble||'Every two minutes while the app is open. Put away, the phone stops until it is opened again.'}</small></p>
    :mine?<p><small>Last shared {ageText(checkinAge(mine,now))}.</small></p>:null}
   <div className="row wrap">
    <button type="button" disabled={working} onClick={shareOnce}><LocateFixed size={16}/>{working?'Finding you…':'Just now'}</button>
    {SHARE_FOR.map(m=><button type="button" key={m} className={live.until?'':'primary'} disabled={working} onClick={()=>{live.start(m);notice(`Sharing where you are for ${m<60?`${m} min`:m===60?'an hour':`${m/60} hours`}.`);}}>{m<60?`${m} min`:m===60?'1 hour':`${m/60} hours`}</button>)}
    {(mine||live.until)&&<button type="button" disabled={working} onClick={stop}><EyeOff size={16}/>Stop sharing</button>}
   </div>
   <p><small>Rounded to about 100 m and deleted after {CHECKIN_HOURS} hours. {parent?'The boys see where Mum and Dad are; only a parent sees where the boys are.':'Mum and Dad see where you are, and you see where they are.'} For somebody’s exact place in the background, Find My does it properly.</small></p>
  </section>
  <section className="feature-card wa-people">
   <h2><Users size={18}/> Everyone</h2>
   <ul className="wa-list">
    {others.map(c=>{const km=me?kmBetween(me,c):null;return <li key={c.name} className={lateNames.has(c.name)?'late':''}>
     <span><strong>{c.name}</strong><small>{ageText(checkinAge(c,now))}{km!=null?` · ${kmText(km)} from you`:''}{lateNames.has(c.name)?' · running late':''}</small></span>
     <button type="button" className="icon" aria-label={`Show ${c.name} on the map`} onClick={()=>centre(c)}><Crosshair size={17}/></button>
     <a className="button" href={walkTo(c)} target="_blank" rel="noopener noreferrer"><Navigation size={15}/>Walk there</a>
    </li>;})}
    {quiet.map(n=><li key={n} className="quiet"><span><strong>{n}</strong><small>{parent||parentsOf(state).includes(n)?`Nothing shared in the last ${CHECKIN_HOURS} hours`:'Only a parent sees where the boys are'}</small></span></li>)}
   </ul>
   <button type="button" disabled={finding} onClick={findMe}><Crosshair size={16}/>{finding?'Finding you…':me?'Find me again':'Show me on the map'}</button>
   <p><small>Show me puts you on this map only. It is not sent to anyone.</small></p>
  </section>
  <p><small>Map tiles come from OpenStreetMap, so the map itself needs a signal.</small></p>
 </>;
}
