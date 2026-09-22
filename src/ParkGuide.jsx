import React,{useState} from 'react';
import {Check,Star,MapPin,ExternalLink,Ticket,AlertCircle,Ruler} from 'lucide-react';
import {PARKS,parkLands,ridePlanned} from './park-data.js';
import {BOYS,riddenBy,isMustDo,heightCheck,parkProgress} from './trip-features.js';
import {CardFacts,factAloudFor} from './FunFacts.jsx';
import {factsForItem} from './fact-data.js';
const mapSearch=(ride,park)=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ride.name} ${park.name}`)}`;
export default function ParkGuide({state,user,speak,openPage,park:initial,mutate,busy,open}){
 const [parkId,setParkId]=useState(initial?.id||PARKS[0].id);
 const park=PARKS.find(p=>p.id===parkId)||PARKS[0];
 const [land,setLand]=useState(''),[only,setOnly]=useState('');
 const parent=user.role==='parent',heights=state.heights||{};
 // A ride is its name and the land it stands in, which is enough for the facts about it: the
 // honey pots that steer themselves, the volcano the ride runs through, the ports the lands
 // are called. Queueing is when anybody has time to read one.
 const aloud=factAloudFor(speak,user.name);
 const [editHeights,setEditHeights]=useState(false);
 const rides=park.rides.filter(r=>(!land||r.land===land)&&(only!=='must'||isMustDo(state,r.id))&&(only!=='todo'||!Object.keys(riddenBy(state,r.id)).length));
 const mapDoc=state.documents.find(d=>d.category!=='memory'&&(d.tags||[]).some(t=>t.toLowerCase()==='park map')&&(d.title||'').toLowerCase().includes(park.short.toLowerCase()));
 async function saveHeights(e){
  e.preventDefault();const f=new FormData(e.currentTarget),next={};
  for(const n of BOYS){const v=f.get(n);if(String(v).trim()!=='')next[n]=Number(v);}
  if(await mutate({type:'familyHeights',heights:next}))setEditHeights(false);
 }
 return <>
  <div className="segmented">{PARKS.map(p=><button key={p.id} className={p.id===park.id?'selected':''} onClick={()=>{setParkId(p.id);setLand('');}}>{p.short}</button>)}</div>
  <p className="callout"><AlertCircle size={18}/>Heights and ride names were gathered before the trip and are a planning aid, not a confirmed source. Parks change them and rides close. Check the official app on the day, especially for Nate.</p>

  <section className="park-map-card">
   <h3><MapPin size={16}/> {park.name} map</h3>
   <p>{park.mapNote}</p>
   <div className="row wrap">
    <a className="button primary" href={park.app} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Official app</a>
    <a className="button" href={park.site} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Park website</a>
    {open&&<button onClick={()=>open({type:'tickets',initialSearch:'park map'})}><Ticket size={16}/>{mapDoc?'Our saved map':'Save our own copy'}</button>}
   </div>
   <small>The parks’ own maps are their copyright, so the app links to them rather than shipping a copy. To have one offline, save a screenshot or the app’s PDF under Tickets with the tag <strong>park map</strong> and the park’s name in the title — it then downloads with the rest of that day.</small>
  </section>

  <section className="park-heights">
   <div className="section-heading"><h3><Ruler size={16}/> How tall are the boys?</h3>{parent&&<button onClick={()=>setEditHeights(v=>!v)}>{editHeights?'Cancel':'Set heights'}</button>}</div>
   {editHeights
    ?<form onSubmit={saveHeights}><div className="form-row">{BOYS.map(n=><label key={n}>{n} (cm)<input name={n} type="number" min="50" max="220" defaultValue={heights[n]??''} placeholder="e.g. 112"/></label>)}</div><button className="primary" disabled={busy}>Save heights</button></form>
    :<p>{BOYS.every(n=>!heights[n])?'Add each boy’s height and every ride will say plainly whether he is tall enough.':BOYS.map(n=>heights[n]?`${n} ${heights[n]}cm`:`${n} — not set`).join(' · ')}</p>}
  </section>

  <div className="quest-progress">{BOYS.map(n=><strong key={n}>{n}: {parkProgress(state,park,n)} / {park.rides.length}</strong>)}<span>Tick a ride once it is done. Star the ones we must not miss.</span></div>
  <div className="document-filters"><div className="form-row">
   <label>Area<select value={land} onChange={e=>setLand(e.target.value)}><option value="">Everywhere</option>{parkLands(park).map(l=><option key={l}>{l}</option>)}</select></label>
   <label>Show<select value={only} onChange={e=>setOnly(e.target.value)}><option value="">All rides</option><option value="must">Must-do only</option><option value="todo">Not ridden yet</option></select></label>
  </div></div>

  <div className="ride-list">{rides.map(ride=>{
   const ridden=riddenBy(state,ride.id),must=isMustDo(state,ride.id),planned=ridePlanned(state,park,ride);
   return <article className={`ride-card${Object.keys(ridden).length?' ridden':''}`} key={ride.id}>
    <div className="ride-top">
     <div><strong>{ride.name}</strong><small>{ride.land}{planned?' · in our plan':''}</small></div>
     {parent&&<button className={`icon star${must?' on':''}`} aria-label={must?`Remove ${ride.name} from must-do`:`Mark ${ride.name} must-do`} aria-pressed={must} disabled={busy} onClick={()=>mutate({type:'parkMust',rideId:ride.id,must:!must})}><Star size={19}/></button>}
    </div>
    <p>{ride.note}</p>
    <CardFacts facts={factsForItem(ride.name,ride.land)} openPage={openPage} aloud={aloud}/>
    <div className="ride-heights">{ride.height
     ?BOYS.map(n=>{const check=heightCheck(ride,n,heights);return <span key={n} className={`ride-height${check.ok===true?' ok':check.ok===false?' no':''}`}>{check.ok===true?<Check size={14}/>:check.ok===false?'✕ ':null}{check.ok===null?`${ride.height}cm minimum`:check.label}</span>;})
     :<span className="ride-height ok"><Check size={14}/>No height limit</span>}</div>
    <div className="row wrap">
     {state.members.map(n=><button key={n} className={`rider${ridden[n]?' on':''}`} disabled={busy||(!parent&&n!==user.name)} aria-pressed={!!ridden[n]}
       onClick={()=>mutate({type:'parkRide',rideId:ride.id,person:n,done:!ridden[n]})}>{ridden[n]&&<Check size={14}/>}{n}</button>)}
     <a href={mapSearch(ride,park)} target="_blank" rel="noopener noreferrer"><MapPin size={14}/>Maps</a>
    </div>
   </article>;})}</div>
  {!rides.length&&<div className="empty"><p>Nothing matches that filter.</p></div>}
 </>;
}
