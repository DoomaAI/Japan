import React,{useEffect,useState} from 'react';
import {Ticket,Plus,Trash2,Clock} from 'lucide-react';
import {findRide,openRides} from './park-data.js';
import {japanClock,japanDate,minutes,spanWords} from './timing.js';
import {hasDpa,dpaFor,nextDpa,dpaReturn,dpaStep} from './dpa.js';
// The DPAs bought for a Disney day, and when the next one can be bought: an hour after the last.
// On the day itself it counts down to that minute, and says so once it has come.
export default function DpaLog({state,user,park,mutate,busy}){
 const parent=user.role==='parent',today=japanDate()===park.day;
 const [now,setNow]=useState(()=>japanClock()),[adding,setAdding]=useState(false);
 useEffect(()=>{if(!today)return;const t=setInterval(()=>setNow(japanClock()),20000);return ()=>clearInterval(t);},[today]);
 if(!hasDpa(park))return null;
 const list=dpaFor(state,park),next=nextDpa(state,park);
 if(!list.length&&!parent)return null;
 const wait=next&&today?minutes(next)-minutes(now):null;
 async function add(e){
  e.preventDefault();const f=new FormData(e.currentTarget);
  if(await mutate({type:'dpaAdd',park:park.id,rideId:f.get('ride'),at:f.get('at')||null,returnTime:f.get('return'),addToPlan:f.get('plan')==='on'}))setAdding(false);
 }
 return <section className="dpa-log">
  <div className="section-heading"><h3><Ticket size={16}/> Our DPAs</h3>{parent&&<button onClick={()=>setAdding(v=>!v)}>{adding?'Cancel':<><Plus size={15}/>Log a DPA</>}</button>}</div>
  <p className="dpa-next"><Clock size={16}/>{!next?'No DPA bought yet: the first can be bought as soon as we are in.'
   :wait!==null&&wait<=0?<><strong>Next DPA: you can buy it now</strong> (open since {next}).</>
   :<><strong>Next DPA from {next}</strong>{wait!==null?`, in ${spanWords(wait)}`:''}: an hour after the last one was bought.</>}</p>
  {adding&&<form className="express-add" onSubmit={add}>
   <label>Ride<select name="ride" required defaultValue=""><option value="" disabled>Choose a ride</option>{openRides(park).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
   <div className="form-row">
    <label>Bought at<input name="at" type="time" defaultValue={today?now:''} required={!today}/></label>
    <label>Return time<input name="return" type="time" required/></label>
   </div>
   <label className="checkline"><input type="checkbox" name="plan" defaultChecked/>Put the return time in the day as a 1-hour entry window</label>
   <button className="primary" disabled={busy}>Save DPA</button>
  </form>}
  {list.length>0&&<ul className="dpa-list">{list.map(d=>{const ride=findRide(d.rideId),step=dpaStep(state,park,d.rideId);return <li key={d.id}>
   <span><strong>{ride?.name||'Ride'}</strong><small>Bought {d.at} · return {dpaReturn(d)}{step?.bookingTime===d.returnTime?' · in the plan':''}</small></span>
   {parent&&<button className="icon" aria-label={`Remove the DPA for ${ride?.name||'this ride'}`} disabled={busy} onClick={()=>confirm(`Take the ${ride?.name||''} DPA off the log? The plan is left as it is.`)&&mutate({type:'dpaRemove',id:d.id})}><Trash2 size={16}/></button>}
  </li>;})}</ul>}
 </section>;
}
