import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {ExternalLink,Star,Check,MapPin,RefreshCw,AlertCircle,Clock,Users,LocateFixed,Navigation,X,CableCar,Utensils,Crosshair} from 'lucide-react';
import PageTitle from './PageTitle.jsx';
import {useStored} from './stored.js';
import {askPhoneWhereItIs} from './geo.js';
import {japanDate,japanClock} from './timing.js';
import {checkinAge,ageText} from './memory-map.js';
import {escapeHtml as esc} from './text.js';
import {SKI_RESORTS,skiResort,GRADES,WAITS_NOTE,OSM_CREDIT,OSM_COPYRIGHT,runDoneBy,runWantedBy,runsDoneAt,meetingPlaces,
 activeMeetups,answerOf,MEETUP_ANSWERS,meetupWhen,quickTimes} from './ski-data.js';
// The Sapporo ski fields: which lifts are turning today (the resort's own page), the runs to
// tick off the way the park rides are, a map of them, and meet-ups at a lift or a lodge that
// tell the whole group. The map data is kept on this phone after the first read, so the
// checklist still opens on a chairlift with no signal.
const VIEWS=[['lifts','Lifts'],['runs','Runs'],['map','Map'],['meet','Meet up']];
const MAP_FRESH_MS=12*3600000;
const walkTo=p=>`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking`;
const km=m=>m>=1000?`${(m/1000).toFixed(1)} km`:`${m} m`;
const Grade=({grade})=>grade?<span className={`ski-grade ${grade}`}>{GRADES[grade].label}</span>:<span className="ski-grade">Not graded</span>;

// The map for one resort: this phone's copy at once, then the server's if it is older than half
// a day or missing. A failed read keeps the copy and says so.
function useSkiMap(resort,request){
 const [maps,setMaps]=useStored('japan.skiMaps',{}),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const map=maps[resort.id]||null;
 const load=useCallback(async(force=false)=>{
  if(!request)return;
  if(!force&&map&&Date.now()-Date.parse(map.checkedAt)<MAP_FRESH_MS)return;
  setLoading(true);
  try{const d=await request(`ski-map?resort=${encodeURIComponent(resort.id)}`);setMaps(m=>({...m,[resort.id]:d}));setError('');}
  catch(e){setError(e.message||'The run map could not be read.');}
  finally{setLoading(false);}
 },[request,resort.id,map,setMaps]);
 useEffect(()=>{setError('');load();},[resort.id,!!request]);// eslint-disable-line react-hooks/exhaustive-deps
 return {map,loading,error,reload:()=>load(true)};
}

export default function SkiFields({state,user,now,request,mutate,busy,go,notice,live}){
 const params=useMemo(()=>{try{return new URLSearchParams(location.search);}catch{return new URLSearchParams();}},[]);
 const linked=(state.meetups||[]).find(m=>m.id===params.get('meetup'));
 const [resortId,setResortId]=useStored('japan.skiResort',linked?.resort||SKI_RESORTS[0].id);
 const [view,setView]=useState(linked?'meet':'lifts');
 const resort=skiResort(resortId)||SKI_RESORTS[0];
 const {map,loading,error,reload}=useSkiMap(resort,request);
 const [meetAt,setMeetAt]=useState(null),[focus,setFocus]=useState(null);
 const planMeet=place=>{setMeetAt(place);setView('meet');};
 const showOnMap=(thing,rid)=>{if(rid&&rid!==resort.id)setResortId(rid);setFocus(thing);setView('map');};
 const pick=id=>{setResortId(id);setFocus(null);setMeetAt(null);};
 return <>
  <p className="eyebrow">SAPPORO SKI FIELDS</p>
  <PageTitle help={<><p>Pick the resort along the top. <strong>Lifts</strong> goes to the resort’s own page for what is turning today. <strong>Runs</strong> is the checklist: star what you want, tick it once it is done. <strong>Meet up</strong> sets a time at a lift or a lodge, and everyone is told.</p></>}>Ski fields</PageTitle>
  <div className="segmented ski-resorts">{SKI_RESORTS.map(r=><button key={r.id} className={r.id===resort.id?'selected':''} onClick={()=>pick(r.id)}>{r.short}</button>)}</div>
  <div className="segmented">{VIEWS.map(([id,label])=><button key={id} className={id===view?'selected':''} onClick={()=>setView(id)}>{label}</button>)}</div>
  {error&&<p className="callout"><AlertCircle size={18}/>{error}{map?' Showing the copy on this phone.':''}</p>}
  {view==='lifts'&&<Lifts resort={resort} map={map} loading={loading} reload={reload} online={!!request} planMeet={planMeet} showOnMap={showOnMap}/>}
  {view==='runs'&&<Runs state={state} user={user} resort={resort} map={map} loading={loading} mutate={mutate} busy={busy} showOnMap={showOnMap}/>}
  {view==='map'&&<SkiMap state={state} user={user} resort={resort} map={map} request={request} now={now} focus={focus} setFocus={setFocus} mutate={mutate} busy={busy} planMeet={planMeet} notice={notice}/>}
  {view==='meet'&&<Meetups state={state} user={user} resort={resort} map={map} now={now} mutate={mutate} busy={busy} meetAt={meetAt} setMeetAt={setMeetAt} highlight={linked?.id} showOnMap={showOnMap} go={go} live={live} notice={notice}/>}
  <p className="ski-credit"><small><a href={OSM_COPYRIGHT} target="_blank" rel="noopener noreferrer">{OSM_CREDIT}</a>. Runs the mappers have not drawn are not listed; the resort’s own trail map has every run.</small></p>
 </>;
}

function Lifts({resort,map,loading,reload,online,planMeet,showOnMap}){
 return <>
  <section className="feature-card ski-status">
   <h2><CableCar size={18}/> {resort.name} <small lang="ja">{resort.ja}</small></h2>
   <p>{resort.about}</p>
   <div className="row wrap">
    <a className="button primary" href={resort.status} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>{resort.statusLabel}</a>
    {resort.report&&resort.report!==resort.status&&<a className="button" href={resort.report} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Snow report</a>}
    <a className="button" href={resort.site} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Website and trail map</a>
   </div>
   <p><small>Which lifts are running is on the resort’s own page: lifts stop for wind and the morning safety check, so look before you go up.</small></p>
  </section>
  <section className="feature-card">
   <h2><Clock size={18}/> Lift queues</h2>
   <p>{resort.queues}</p>
   <p><small>{WAITS_NOTE} If you are at the bottom of a busy one, a meet-up note tells the others.</small></p>
  </section>
  <section className="feature-card">
   <div className="section-heading"><h2><CableCar size={18}/> The lifts</h2>{online&&<button onClick={reload} disabled={loading}><RefreshCw size={15}/>{loading?'Reading…':'Refresh'}</button>}</div>
   {!map?<p>{loading?'Reading the lifts…':online?'The lifts have not been read yet.':'The lifts are read with a signal, then kept on this phone.'}</p>
    :!map.lifts.length?<p>No lifts are mapped here yet. The trail map on the resort’s site has them.</p>
    :<ul className="ski-lifts">{map.lifts.map(l=><li key={l.id}>
      <span><strong>{l.name}</strong><small>{l.kind}{l.lengthM?` · ${km(l.lengthM)}`:''}{l.ja?<> · <span lang="ja">{l.ja}</span></>:null}</small></span>
      <span className="row wrap">
       <button onClick={()=>planMeet({id:`${l.id}-top`,label:`Top of ${l.name}`,lat:l.top[0],lon:l.top[1]})}>Meet at top</button>
       <button onClick={()=>planMeet({id:`${l.id}-bottom`,label:`Bottom of ${l.name}`,lat:l.bottom[0],lon:l.bottom[1]})}>Meet at bottom</button>
       <button className="icon" aria-label={`Show ${l.name} on the map`} onClick={()=>showOnMap({lift:l.id})}><MapPin size={16}/></button>
      </span>
     </li>)}</ul>}
  </section>
 </>;
}

function Runs({state,user,resort,map,loading,mutate,busy,showOnMap}){
 const [grade,setGrade]=useState(''),[only,setOnly]=useState('');
 const runs=map?.runs||[];
 const show={mine:r=>runWantedBy(state,r.id).includes(user.name),starred:r=>runWantedBy(state,r.id).length>0,todo:r=>!runDoneBy(state,r.id)[user.name],done:r=>!!runDoneBy(state,r.id)[user.name]};
 const list=runs.filter(r=>(!grade||r.grade===grade)&&(!only||show[only](r)));
 const board=state.members.map(n=>[n,runsDoneAt(state,resort.id,n)]).filter(([,c])=>c>0).sort((a,b)=>b[1]-a[1]);
 const tick=(r,type,on)=>mutate(type==='done'?{type:'skiRun',runId:r.id,name:r.name,person:user.name,done:on}:{type:'skiWant',runId:r.id,name:r.name,person:user.name,want:on});
 if(!map)return <div className="empty"><p>{loading?'Reading the runs…':'The runs are read with a signal the first time, then kept on this phone.'}</p><a className="button" href={resort.site} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Resort trail map</a></div>;
 return <>
  <div className="quest-progress"><strong>You: {runsDoneAt(state,resort.id,user.name)} / {runs.length}</strong>
   {board.filter(([n])=>n!==user.name).slice(0,5).map(([n,c])=><strong key={n}>{n}: {c}</strong>)}
   <span>Star the runs you want to do. Tick a run once you have done it.</span></div>
  <div className="document-filters"><div className="form-row">
   <label>Grade<select value={grade} onChange={e=>setGrade(e.target.value)}><option value="">Any</option>{Object.entries(GRADES).map(([k,g])=><option key={k} value={k}>{g.label}</option>)}</select></label>
   <label>Show<select value={only} onChange={e=>setOnly(e.target.value)}><option value="">All runs</option><option value="todo">Not done by me</option><option value="done">Done by me</option><option value="mine">My stars</option><option value="starred">Starred by anyone</option></select></label>
  </div></div>
  <div className="ride-list">{list.map(r=>{
   const done=runDoneBy(state,r.id),who=Object.keys(done),wants=runWantedBy(state,r.id),mine=wants.includes(user.name),me=!!done[user.name];
   return <article key={r.id} className={`ride-card ski-run${me?' ridden':''}`}>
    <div className="ride-top">
     <div><strong>{r.name}</strong><small>{r.ja?<span lang="ja">{r.ja}</span>:null}{r.ja&&r.lengthM?' · ':''}{r.lengthM?km(r.lengthM):''}</small></div>
     <button className={`icon star${mine?' on':''}`} aria-label={mine?`Unstar ${r.name}`:`Star ${r.name}: I want to do it`} aria-pressed={mine} disabled={busy} onClick={()=>tick(r,'want',!mine)}><Star size={19} fill={mine?'currentColor':'none'}/></button>
    </div>
    <div className="ride-tags"><Grade grade={r.grade}/>
     {r.grooming&&<span className="ski-groomed">{r.grooming==='backcountry'?'Ungroomed':'Groomed'}</span>}
     {wants.length>0&&<span className="ride-stars"><Star size={13} fill="currentColor"/>{wants.join(', ')}</span>}</div>
    {who.length>0&&<p><small>Done by {who.join(', ')}</small></p>}
    <div className="row wrap">
     <button className={`rider${me?' on':''}`} aria-pressed={me} disabled={busy} onClick={()=>tick(r,'done',!me)}>{me&&<Check size={14}/>}{me?'Done':'I’ve done it'}</button>
     <button className="linkish" onClick={()=>showOnMap({run:r.id})}><MapPin size={14}/>On the map</button>
    </div>
   </article>;})}</div>
  {!runs.length&&<div className="empty"><p>No named runs are mapped at {resort.short} yet. The trail map on the resort’s site has them.</p></div>}
  {runs.length>0&&!list.length&&<div className="empty"><p>Nothing matches that filter.</p></div>}
 </>;
}

const pinIcon=(cls,text)=>L.divIcon({className:'',iconSize:[28,28],iconAnchor:[14,14],html:`<span class="ski-pin ${cls}">${esc(text)}</span>`});
const personIcon=(name,old)=>L.divIcon({className:'',iconSize:[36,36],iconAnchor:[18,18],html:`<span class="mm-person${old?' old':''}">${esc(name.slice(0,1))}</span>`});
function SkiMap({state,user,resort,map,request,now,focus,setFocus,mutate,busy,planMeet,notice}){
 const box=useRef(null),m=useRef(null),layer=useRef(null),fitted=useRef('');
 const [checkins,setCheckins]=useState([]),[me,setMe]=useState(null),[finding,setFinding]=useState(false);
 const refresh=useCallback(()=>request?request('checkins').then(r=>setCheckins(r.checkins||[])).catch(()=>{}):Promise.resolve(),[request]);
 useEffect(()=>{refresh();const t=setInterval(refresh,30000);return()=>clearInterval(t);},[refresh]);
 useEffect(()=>{
  const lm=L.map(box.current,{zoomControl:true}).setView([resort.centre.lat,resort.centre.lon],resort.zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',
   attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'}).addTo(lm);
  layer.current=L.layerGroup().addTo(lm);m.current=lm;
  return()=>{lm.remove();m.current=null;};
 },[resort.id]);
 const meetups=activeMeetups(state,now?.getTime?.()??Date.now()).filter(x=>x.resort===resort.id&&x.place.lat!=null);
 useEffect(()=>{
  const lm=m.current,g=layer.current;if(!lm||!g)return;
  g.clearLayers();const bounds=[];
  for(const u of map?.unnamed||[])for(const pts of u.lines)L.polyline(pts,{color:GRADES[u.grade]?.colour||'#868e96',weight:3,opacity:.45}).addTo(g);
  for(const r of map?.runs||[]){
   const done=!!runDoneBy(state,r.id)[user.name],on=focus?.run===r.id;
   for(const pts of r.lines){
    L.polyline(pts,{color:GRADES[r.grade]?.colour||'#868e96',weight:on?8:done?3:5,opacity:done&&!on?.5:.9,dashArray:done&&!on?'2 6':null})
     .bindTooltip(esc(`${r.name}${done?' ✓':''}`),{sticky:true}).on('click',()=>setFocus({run:r.id})).addTo(g);
    bounds.push(...pts);
   }
  }
  for(const l of map?.lifts||[]){
   const on=focus?.lift===l.id;
   L.polyline(l.line,{color:'#495057',weight:on?6:3,dashArray:'8 6'}).bindTooltip(esc(l.name),{sticky:true}).on('click',()=>setFocus({lift:l.id})).addTo(g);
   L.circleMarker(l.top,{radius:5,color:'#495057',fillColor:'#fff',fillOpacity:1,weight:2}).bindTooltip(esc(`Top of ${l.name}`)).on('click',()=>setFocus({lift:l.id})).addTo(g);
   bounds.push(l.bottom,l.top);
  }
  for(const f of map?.food||[])L.marker([f.lat,f.lon],{icon:pinIcon('food','🍜'),title:f.name,keyboard:false}).bindTooltip(esc(f.name)).on('click',()=>setFocus({food:f.id})).addTo(g);
  for(const x of meetups)L.marker([x.place.lat,x.place.lon],{icon:pinIcon('meet','📍'),title:x.place.label,zIndexOffset:1500}).bindTooltip(esc(`${meetupWhen(x)} · ${x.place.label}`)).addTo(g);
  for(const c of checkins){const age=checkinAge(c,now);L.marker([c.lat,c.lng],{icon:personIcon(c.name,age>30),title:c.name,zIndexOffset:2000}).bindTooltip(esc(`${c.name} · ${ageText(age)}`)).addTo(g);}
  if(me)L.marker([me.lat,me.lng],{icon:L.divIcon({className:'',iconSize:[22,22],iconAnchor:[11,11],html:'<span class="wa-me"></span>'}),zIndexOffset:3000}).bindTooltip('You').addTo(g);
  const key=`${resort.id}|${map?.checkedAt||''}`;
  if(bounds.length&&fitted.current!==key){lm.fitBounds(bounds,{padding:[24,24],maxZoom:16});fitted.current=key;}
 },[map,state,user.name,focus,checkins,me,resort.id,now]);
 // Bring whatever was asked for from another tab into view.
 useEffect(()=>{
  const lm=m.current;if(!lm||!map||!focus)return;
  const run=focus.run&&map.runs.find(r=>r.id===focus.run),lift=focus.lift&&map.lifts.find(l=>l.id===focus.lift),meet=focus.meetup&&(state.meetups||[]).find(x=>x.id===focus.meetup);
  const pts=run?run.lines.flat():lift?lift.line:meet?.place?.lat!=null?[[meet.place.lat,meet.place.lon]]:null;
  if(pts?.length)lm.fitBounds(pts,{padding:[40,40],maxZoom:16});
 },[focus?.run,focus?.lift,focus?.meetup,map]);// eslint-disable-line react-hooks/exhaustive-deps
 async function findMe(){setFinding(true);try{const p=await askPhoneWhereItIs(5);setMe(p);m.current?.setView([p.lat,p.lng],16);}catch(e){notice?.(`${e.message}.`);}finally{setFinding(false);}}
 const run=focus?.run&&map?.runs.find(r=>r.id===focus.run),lift=focus?.lift&&map?.lifts.find(l=>l.id===focus.lift),food=focus?.food&&map?.food.find(f=>f.id===focus.food);
 const mineDone=run&&!!runDoneBy(state,run.id)[user.name];
 return <>
  <div className="mm-map ski-map" ref={box} role="region" aria-label={`Map of the runs at ${resort.name}`}/>
  <p className="mm-legend">{Object.entries(GRADES).map(([k,g])=><span key={k}><span className="ski-key" style={{background:g.colour}}/>{g.label}</span>)}<span><span className="ski-key lift"/>Lift</span><span>🍜 Food</span><span>📍 Meet-up</span><span><span className="mm-key wa-key-person"/>Group</span></p>
  {!map&&<p className="callout"><AlertCircle size={18}/>The runs are read with a signal the first time, then kept on this phone.</p>}
  {run&&<section className="feature-card ski-focus"><div className="section-heading"><h3>{run.name}</h3><button className="icon" aria-label="Close" onClick={()=>setFocus(null)}><X size={16}/></button></div>
   <div className="ride-tags"><Grade grade={run.grade}/>{run.lengthM?<span>{km(run.lengthM)}</span>:null}{run.ja&&<span lang="ja">{run.ja}</span>}</div>
   <button className={`rider${mineDone?' on':''}`} aria-pressed={mineDone} disabled={busy} onClick={()=>mutate({type:'skiRun',runId:run.id,name:run.name,person:user.name,done:!mineDone})}>{mineDone&&<Check size={14}/>}{mineDone?'Done':'I’ve done it'}</button></section>}
  {lift&&<section className="feature-card ski-focus"><div className="section-heading"><h3>{lift.name}</h3><button className="icon" aria-label="Close" onClick={()=>setFocus(null)}><X size={16}/></button></div>
   <p><small>{lift.kind}{lift.lengthM?` · ${km(lift.lengthM)}`:''}</small></p>
   <div className="row wrap"><button onClick={()=>planMeet({id:`${lift.id}-top`,label:`Top of ${lift.name}`,lat:lift.top[0],lon:lift.top[1]})}>Meet at top</button>
    <button onClick={()=>planMeet({id:`${lift.id}-bottom`,label:`Bottom of ${lift.name}`,lat:lift.bottom[0],lon:lift.bottom[1]})}>Meet at bottom</button></div></section>}
  {food&&<section className="feature-card ski-focus"><div className="section-heading"><h3><Utensils size={16}/> {food.name}</h3><button className="icon" aria-label="Close" onClick={()=>setFocus(null)}><X size={16}/></button></div>
   <button onClick={()=>planMeet({id:food.id,label:food.name,lat:food.lat,lon:food.lon})}>Meet here</button></section>}
  <div className="row wrap"><button disabled={finding} onClick={findMe}><Crosshair size={16}/>{finding?'Finding you…':me?'Find me again':'Show me on the map'}</button></div>
  <p><small>Tap a run to tick it, a lift to meet at it. The group is drawn where each phone last shared its position. The map needs a signal for its background; the runs and lifts are kept on this phone.</small></p>
 </>;
}

// A time typed as 12:30 is today in Japan, or tomorrow if 12:30 has gone.
function typedTime(hhmm,now=Date.now()){
 if(!/^\d{2}:\d{2}$/.test(hhmm))return null;
 const day=japanDate(new Date(now));let at=Date.parse(`${day}T${hhmm}:00+09:00`);
 if(at<now-10*60000)at+=86400000;
 return new Date(at).toISOString();
}
const NOTES=['Lunch','Coffee','Regroup','Last run','Heading home'];
function Meetups({state,user,resort,map,now,mutate,busy,meetAt,setMeetAt,highlight,showOnMap,go,live,notice}){
 const places=useMemo(()=>meetingPlaces(map),[map]);
 const [placeId,setPlaceId]=useState(''),[custom,setCustom]=useState(''),[time,setTime]=useState(''),[quick,setQuick]=useState(null),[note,setNote]=useState('');
 const nowMs=now?.getTime?.()??Date.now();
 useEffect(()=>{if(meetAt){setPlaceId(meetAt.id||'');setCustom(meetAt.id?'':meetAt.label||'');}},[meetAt]);
 const chosen=meetAt&&meetAt.id===placeId?meetAt:places.find(p=>p.id===placeId)||null;
 const at=quick||typedTime(time,nowMs);
 const label=chosen?.label||custom.trim();
 async function add(e){
  e.preventDefault();if(!label||!at)return;
  const place=chosen?{label:chosen.label,lat:chosen.lat,lon:chosen.lon}:{label};
  if(await mutate({type:'meetupAdd',resort:resort.id,place,at,note:note.trim()})){setPlaceId('');setCustom('');setTime('');setQuick(null);setNote('');setMeetAt(null);notice?.('The group has been told.');}
 }
 const list=activeMeetups(state,nowMs);
 const groups=[...new Set(places.map(p=>p.group))];
 const parent=user.role==='parent';
 return <>
  <section className="feature-card ski-meet-form">
   <h2><MapPin size={18}/> Set a meet-up</h2>
   <form onSubmit={add}>
    <label>Where{places.length
     ?<select value={placeId} onChange={e=>{setPlaceId(e.target.value);setMeetAt(null);}}><option value="">Choose a lift or a lodge…</option>
       {meetAt&&!places.some(p=>p.id===meetAt.id)&&meetAt.id&&<option value={meetAt.id}>{meetAt.label}</option>}
       {groups.map(g=><optgroup key={g} label={g}>{places.filter(p=>p.group===g).map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>)}</select>
     :null}</label>
    {!chosen&&<label>{places.length?'Or somewhere else':'Where'}<input value={custom} maxLength={100} placeholder="e.g. the ticket office" onChange={e=>setCustom(e.target.value)}/></label>}
    <div className="row wrap ski-quick">{quickTimes(nowMs).map(q=><button type="button" key={q.min} className={quick===q.at?'selected':''} onClick={()=>{setQuick(q.at);setTime('');}}>In {q.min} min</button>)}
     <label>At<input type="time" value={time} onChange={e=>{setTime(e.target.value);setQuick(null);}}/></label></div>
    <div className="row wrap ski-quick">{NOTES.map(n=><button type="button" key={n} className={note===n?'selected':''} onClick={()=>setNote(note===n?'':n)}>{n}</button>)}</div>
    <label>Note<input value={note} maxLength={140} placeholder="Lunch, last run, bring the kids’ gloves…" onChange={e=>setNote(e.target.value)}/></label>
    <button className="primary" disabled={busy||!label||!at}>{at&&label?`Meet at ${label}, ${japanClock(new Date(at))}`:'Choose a place and a time'}</button>
   </form>
   <p><small>Everyone in the group is told now, and again {15} minutes before. Turn on <strong>Ski meet-ups</strong> under Settings → Notifications.</small></p>
  </section>
  {list.length>0?<div className="ski-meetups">{list.map(x=><MeetupCard key={x.id} m={x} state={state} user={user} now={nowMs} mutate={mutate} busy={busy} highlight={x.id===highlight} canCancel={parent||x.by===user.name} showOnMap={showOnMap}/>)}</div>
   :<div className="empty"><p>No meet-ups yet.</p></div>}
  <section className="feature-card">
   <h2><Users size={18}/> Where everyone is</h2>
   <p>{live?.until?<>Sharing your position until <strong>{japanClock(new Date(live.until))}</strong>.</>:'Share your position for a while, and the group sees you on the map.'}</p>
   <div className="row wrap">
    {!live?.until&&<button className="primary" onClick={()=>{live?.start(120);notice?.('Sharing where you are for 2 hours.');}}><LocateFixed size={16}/>Share for 2 hours</button>}
    <button onClick={()=>go('whereabouts')}><Users size={16}/>Where we are</button>
   </div>
   <p><small>A web app on an iPhone only sends its position while it is open. Put away in a pocket, the phone stops until it is opened again, and the others see how long ago it last spoke.</small></p>
   {parent&&<label className="check"><input type="checkbox" checked={!!state.whereaboutsOpen} disabled={busy} onChange={e=>mutate({type:'whereaboutsOpen',open:e.target.checked})}/> Everyone in the group sees where everyone is (otherwise only organisers see everyone)</label>}
  </section>
 </>;
}

function MeetupCard({m,state,user,now,mutate,busy,highlight,canCancel,showOnMap}){
 const [late,setLate]=useState(10);
 const mine=answerOf(m,user.name),here=m.here||{},resort=skiResort(m.resort);
 const by=answer=>state.members.filter(n=>answerOf(m,n)===answer&&!here[n]);
 const waiting=state.members.filter(n=>!answerOf(m,n)&&!here[n]);
 const past=Date.parse(m.at)<now;
 return <article className={`feature-card ski-meetup${highlight?' highlight':''}${past?' past':''}`}>
  <div className="section-heading"><h3>{meetupWhen(m)} · {m.place.label}</h3>{canCancel&&<button className="linkish" disabled={busy} onClick={()=>mutate({type:'meetupCancel',id:m.id})}>Call off</button>}</div>
  <p><small>{resort?.short}{m.note?` · ${m.note}`:''} · set by {m.by}</small></p>
  <ul className="ski-answers">
   {Object.keys(here).length>0&&<li><strong>There:</strong> {Object.keys(here).join(', ')}</li>}
   {by('yes').length>0&&<li><strong>Coming:</strong> {by('yes').join(', ')}</li>}
   {by('late').length>0&&<li><strong>Late:</strong> {by('late').map(n=>`${n}${m.answers[n]?.minutes?` (${m.answers[n].minutes} min)`:''}`).join(', ')}</li>}
   {by('no').length>0&&<li><strong>Can’t:</strong> {by('no').join(', ')}</li>}
   {waiting.length>0&&<li><small>Not answered: {waiting.join(', ')}</small></li>}
  </ul>
  <div className="row wrap">
   <button className={mine==='yes'&&!here[user.name]?'selected':''} disabled={busy} onClick={()=>mutate({type:'meetupAnswer',id:m.id,answer:'yes'})}>{MEETUP_ANSWERS.yes}</button>
   <span className="ski-late"><select aria-label="How late" value={late} onChange={e=>setLate(Number(e.target.value))}>{[5,10,15,20,30].map(n=><option key={n} value={n}>{n} min</option>)}</select>
    <button className={mine==='late'?'selected':''} disabled={busy} onClick={()=>mutate({type:'meetupAnswer',id:m.id,answer:'late',minutes:late})}>Late</button></span>
   <button className={mine==='no'?'selected':''} disabled={busy} onClick={()=>mutate({type:'meetupAnswer',id:m.id,answer:'no'})}>{MEETUP_ANSWERS.no}</button>
   <button className={here[user.name]?'selected primary':'primary'} disabled={busy||!!here[user.name]} onClick={()=>mutate({type:'meetupHere',id:m.id})}>{here[user.name]?<><Check size={14}/>You’re there</>:'I’m here'}</button>
  </div>
  {m.place.lat!=null&&<div className="row wrap">
   <button className="linkish" onClick={()=>showOnMap({meetup:m.id},m.resort)}><MapPin size={14}/>On the map</button>
   <a href={walkTo(m.place)} target="_blank" rel="noopener noreferrer"><Navigation size={14}/>Directions</a>
  </div>}
 </article>;
}
