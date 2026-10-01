import React,{useEffect,useState} from 'react';
import {Clock,RefreshCw,ExternalLink,AlertCircle} from 'lucide-react';
import {japanClock} from './timing.js';
import {liveForStop,waitLabel,byWait,ago,isStale,WAITS_CREDIT,WAITS_SOURCE} from './wait-times.js';
// Live waits for a park, read on open and again on Refresh. With a stop, the rides that stop is
// about lead and the rest of the park folds underneath; without one, every ride, busiest first.
// Two times are always shown: when the park last reported, and when this phone last asked.
const at=iso=>iso?`${japanClock(new Date(iso))} JST`:'—';
function Row({r,parkUpdated,now}){
 const own=r.updated&&parkUpdated&&Math.abs(new Date(parkUpdated)-new Date(r.updated))>5*60000;
 return <li className={`wait-row${r.open?'':' closed'}`}>
  <span><strong>{r.name}</strong>{(r.land||own)&&<small>{r.land}{r.land&&own?' · ':''}{own?`updated ${at(r.updated)}, ${ago(r.updated,now)}`:''}</small>}</span>
  <b className={`wait-chip${!r.open?' shut':r.wait>=60?' long':r.wait>=30?' mid':''}`}>{waitLabel(r)}</b>
 </li>;
}
export default function LiveWaits({park,request,step=null,onData}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[all,setAll]=useState(!step),[openOnly,setOpenOnly]=useState(false),[now,setNow]=useState(()=>new Date());
 async function load(){
  if(!request)return;setLoading(true);
  try{const d=await request(`waits?park=${encodeURIComponent(park.id)}`);setData(d);setError('');onData?.(d);}
  catch(e){setError(e.message||'Live wait times could not be read.');}
  finally{setLoading(false);setNow(new Date());}
 }
 useEffect(()=>{setData(null);load();},[park.id]);
 // Keep "3 min ago" honest while the sheet sits open in a queue.
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),30000);return ()=>clearInterval(t);},[]);
 const rides=data?.rides||[],mine=step?liveForStop(rides,step):[],list=byWait(rides.filter(r=>!openOnly||r.open)),stale=data&&isStale(data.updatedAt,now);
 return <section className="live-waits" aria-busy={loading}>
  <div className="section-heading"><h3><Clock size={16}/> Live wait times{step?` · ${step.title}`:` · ${park.short}`}</h3>
   <button onClick={load} disabled={loading||!request}><RefreshCw size={15}/>{loading?'Checking…':'Refresh'}</button></div>
  {data&&<p className="wait-times-line">
   <span>Park updated <strong>{at(data.updatedAt)}</strong>{data.updatedAt?` (${ago(data.updatedAt,now)})`:''}</span>
   <span>Checked {at(data.checkedAt)}{data.stale?' · the feed did not answer, showing the last read':''}</span>
  </p>}
  {stale&&<p className="callout"><AlertCircle size={18}/>These are not live: the park has not reported for over half an hour, so it may be closed or the feed has stalled. Check the official app.</p>}
  {error&&<p className="callout"><AlertCircle size={18}/>{error}</p>}
  {!request&&<p className="callout"><AlertCircle size={18}/>Live wait times need a connection.</p>}
  {step&&data&&(mine.length
   ?<ul className="wait-list focus">{mine.map(r=><Row key={r.name} r={r} parkUpdated={data.updatedAt} now={now}/>)}</ul>
   :<p><small>This stop is not one ride the feed knows by name, so here is the whole park.</small></p>)}
  {data&&rides.length>0&&<>
   {step&&mine.length>0&&<button className="linkish" onClick={()=>setAll(v=>!v)} aria-expanded={all}>{all?'Hide the rest of the park':`Every ride in ${park.short} (${rides.length})`}</button>}
   {(all||!mine.length)&&<>
    <label className="wait-filter"><input type="checkbox" checked={openOnly} onChange={e=>setOpenOnly(e.target.checked)}/> Open rides only</label>
    <ul className="wait-list">{list.map(r=><Row key={r.name} r={r} parkUpdated={data.updatedAt} now={now}/>)}</ul>
   </>}
  </>}
  {data&&!rides.length&&<p><small>The feed has no rides for {park.name} right now.</small></p>}
  <div className="row wrap wait-foot">
   <a className="button" href={park.app} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Official app</a>
   <small><a href={WAITS_SOURCE.url} target="_blank" rel="noopener noreferrer">{WAITS_CREDIT}</a>, read from the park every few minutes. Not official: the park’s own app is the source.</small>
  </div>
 </section>;
}
