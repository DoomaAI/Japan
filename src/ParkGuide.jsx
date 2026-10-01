import React,{useState} from 'react';
import {gentleOnly} from './child-levels.js';
import {Check,Star,MapPin,ExternalLink,Ticket,AlertCircle,Ruler,Ban} from 'lucide-react';
import {PARKS,THRILL,parkLands,openRides,ridePlanned} from './park-data.js';
import {BOYS,riddenBy,wantedBy,isMustDo,heightCheck,parkProgress} from './trip-features.js';
import {CardFacts,factAloudFor} from './FunFacts.jsx';
import ExpressPass from './ExpressPass.jsx';
import DpaLog from './DpaLog.jsx';
import {factsForItem} from './fact-data.js';
import LiveWaits from './LiveWaits.jsx';
import {liveFor,waitLabel} from './wait-times.js';
const mapSearch=(ride,park)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ride.name} ${park.name}`)}`;
export default function ParkGuide({state,user,speak,openPage,park:initial,mutate,busy,open,request}){
 const [parkId,setParkId]=useState(initial?.id||PARKS[0].id);
 const park=PARKS.find(p=>p.id===parkId)||PARKS[0];
 const [land,setLand]=useState(''),[only,setOnly]=useState(''),[thrill,setThrill]=useState('');
 const parent=user.role==='parent',heights=state.heights||{};
 // A ride is its name and the land it stands in, which is enough for the facts about it: the
 // honey pots that steer themselves, the volcano the ride runs through, the ports the lands
 // are called. Queueing is when anybody has time to read one.
 const aloud=factAloudFor(speak,user.name);
 const [editHeights,setEditHeights]=useState(false);
 // The last live read for the park on screen, so each ride card can carry its own wait.
 const [waits,setWaits]=useState(null),live=waits?.park===park.id?waits.rides:null;
 // Each of us stars the rides we want to do; the card says whose stars it has. A star from the
 // older family-wide must-do still counts, and a parent can clear it.
 const show={must:r=>isMustDo(state,r.id),mine:r=>wantedBy(state,r.id).includes(user.name),todo:r=>!Object.keys(riddenBy(state,r.id)).length,open:r=>!r.closed};
 const rides=park.rides.filter(r=>(!land||r.land===land)&&(!only||show[only](r))&&(!thrill||r.thrill===thrill));
 const mapDoc=state.documents.find(d=>d.category!=='memory'&&(d.tags||[]).some(t=>t.toLowerCase()==='park map')&&(d.title||'').toLowerCase().includes(park.short.toLowerCase()));
 async function saveHeights(e){
  e.preventDefault();const f=new FormData(e.currentTarget),next={};
  for(const n of BOYS){const v=f.get(n);if(String(v).trim()!=='')next[n]=Number(v);}
  if(await mutate({type:'familyHeights',heights:next}))setEditHeights(false);
 }
 return <>
  <div className="segmented">{PARKS.map(p=><button key={p.id} className={p.id===park.id?'selected':''} onClick={()=>{setParkId(p.id);setLand('');}}>{p.short}</button>)}</div>
  <p className="callout"><AlertCircle size={18}/>Heights and ride names were gathered before the trip and are a planning aid, not a confirmed source. Parks change them and rides close. Check the official app on the day, especially for Nate.</p>

  <LiveWaits key={park.id} park={park} request={request} onData={setWaits}/>

  <section className="park-map-card">
   <h3><MapPin size={16}/> {park.name} map</h3>
   <p>{park.mapNote}</p>
   <div className="row wrap">
    <a className="button primary" href={park.app} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Map &amp; wait times (official app)</a>
    <a className="button" href={park.site} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Park website</a>
    {open&&<button onClick={()=>open({type:'tickets',initialSearch:'park map'})}><Ticket size={16}/>{mapDoc?'Our saved map':'Save our own copy'}</button>}
   </div>
   <small>The parks’ own maps are their copyright, so the app links to them rather than shipping a copy. To have one offline, save a screenshot or the app’s PDF under Tickets with the tag <strong>park map</strong> and the park’s name in the title — it then downloads with the rest of that day.</small>
  </section>

  <ExpressPass state={state} user={user} park={park} mutate={mutate} busy={busy}/>
  <DpaLog state={state} user={user} park={park} mutate={mutate} busy={busy}/>

  <section className="park-heights">
   <div className="section-heading"><h3><Ruler size={16}/> How tall are the boys?</h3>{parent&&<button onClick={()=>setEditHeights(v=>!v)}>{editHeights?'Cancel':'Set heights'}</button>}</div>
   {editHeights
    ?<form onSubmit={saveHeights}><div className="form-row">{BOYS.map(n=><label key={n}>{n} (cm)<input name={n} type="number" min="50" max="220" defaultValue={heights[n]??''} placeholder="e.g. 112"/></label>)}</div><button className="primary" disabled={busy}>Save heights</button></form>
    :<p>{BOYS.every(n=>!heights[n])?'Add each boy’s height and every ride will say plainly whether he is tall enough.':BOYS.map(n=>heights[n]?`${n} ${heights[n]}cm`:`${n} — not set`).join(' · ')}</p>}
  </section>

  <div className="quest-progress">{BOYS.map(n=><strong key={n}>{n}: {parkProgress(state,park,n)} / {openRides(park).length}</strong>)}<span>Star the rides you want to do. Tick a ride once it is done.</span></div>
  <div className="document-filters"><div className="form-row">
   <label>Area<select value={land} onChange={e=>setLand(e.target.value)}><option value="">Everywhere</option>{parkLands(park).map(l=><option key={l}>{l}</option>)}</select></label>
   <label>Show<select value={only} onChange={e=>setOnly(e.target.value)}><option value="">All rides</option><option value="open">Open today</option><option value="must">Starred by anyone</option><option value="mine">My stars</option><option value="todo">Not ridden yet</option></select></label>
   <label>Thrill<select value={thrill} onChange={e=>setThrill(e.target.value)}><option value="">Any</option>{Object.entries(THRILL).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
  </div></div>

  <div className="ride-list">{rides.map(ride=>{
   const ridden=riddenBy(state,ride.id),wants=wantedBy(state,ride.id),mine=wants.includes(user.name),family=!!state.parkRides?.[ride.id]?.must,planned=ridePlanned(state,park,ride);
   return <article className={`ride-card${Object.keys(ridden).length?' ridden':''}${ride.closed?' closed':''}`} key={ride.id}>
    <div className="ride-top">
     <div><strong>{ride.name}</strong><small>{ride.land}{planned?' · in our plan':''}</small></div>
     <button className={`icon star${mine?' on':''}`} aria-label={mine?`Unstar ${ride.name}`:`Star ${ride.name}: I want to do it`} aria-pressed={mine} disabled={busy} onClick={()=>mutate({type:'parkWant',rideId:ride.id,person:user.name,want:!mine})}><Star size={19} fill={mine?'currentColor':'none'}/></button>
    </div>
    <div className="ride-tags">
     {ride.thrill&&<span className={`ride-thrill ${ride.thrill}`}>{THRILL[ride.thrill]}</span>}
     {live&&(l=>l&&<span className={`ride-wait${l.open?'':' shut'}`}>⏱️ {waitLabel(l)}</span>)(liveFor(live,ride))}
     {ride.closed&&<span className="ride-closed"><Ban size={13}/>{ride.closed}</span>}
     {(wants.length>0||family)&&<span className="ride-stars"><Star size={13} fill="currentColor"/>{[...wants,...(family?['Family must-do']:[])].join(', ')}</span>}
     {family&&parent&&<button className="linkish" disabled={busy} onClick={()=>mutate({type:'parkMust',rideId:ride.id,must:false})}>Clear family star</button>}
    </div>
    <p>{ride.note}</p>
    <CardFacts gentle={gentleOnly(state,user?.name)} facts={factsForItem(ride.name,ride.land)} openPage={openPage} aloud={aloud}/>
    <div className="ride-heights">{ride.height
     ?BOYS.map(n=>{const check=heightCheck(ride,n,heights);return <span key={n} className={`ride-height${check.ok===true?' ok':check.ok===false?' no':''}`}>{check.ok===true?<Check size={14}/>:check.ok===false?'✕ ':null}{check.ok===null?`${ride.height}cm minimum`:check.label}</span>;})
     :<span className="ride-height ok"><Check size={14}/>No height limit</span>}</div>
    <div className="row wrap">
     {parent&&(()=>{const all=state.members.every(n=>ridden[n]);return <button className={`rider${all?' on':''}`} disabled={busy} aria-pressed={all}
       onClick={async()=>{for(const n of state.members)if(!!ridden[n]===all)await mutate({type:'parkRide',rideId:ride.id,person:n,done:!all});}}>{all&&<Check size={14}/>}All</button>;})()}
     {state.members.map(n=><button key={n} className={`rider${ridden[n]?' on':''}`} disabled={busy||(!parent&&n!==user.name)} aria-pressed={!!ridden[n]}
       onClick={()=>mutate({type:'parkRide',rideId:ride.id,person:n,done:!ridden[n]})}>{ridden[n]&&<Check size={14}/>}{n}</button>)}
     <a href={mapSearch(ride,park)} target="_blank" rel="noopener noreferrer"><MapPin size={14}/>Maps</a>
    </div>
   </article>;})}</div>
  {!rides.length&&<div className="empty"><p>Nothing matches that filter.</p></div>}
 </>;
}
