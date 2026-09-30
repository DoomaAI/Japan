import React,{useEffect,useRef,useState} from 'react';
import {LocateFixed,Check,X,MapPin,LifeBuoy,Users} from 'lucide-react';
import {liveCheckIns,checkInDestinations,destinationPosition,checkInStatus,quietMinutes,kmAway,kmText,dueClock,ARRIVE_KM,SHARE_EVERY_MS,CHECKIN_AHEAD_HOURS} from './checkin-data.js';
import {CHECKIN_PLACES,checkinAge,ageText,kmBetween} from './memory-map.js';
import {japanClock,japanDate} from './timing.js';
// The card on Home while a check-in is open. On the phone that started it: sharing where it is
// every couple of minutes, and I'm here. On the others: how far from where they said, how long
// since the phone last spoke, and — past the time with no word for ten minutes — amber, with the
// meeting card and the lost card one tap away. Nobody's position leaves the phone except while
// a check-in of theirs is open, and it goes to the family's own three-hour row, nowhere else.
function useShare({mine,state,request,mutate}){
 const [last,setLast]=useState(null),[trouble,setTrouble]=useState(''),arriving=useRef(false);
 useEffect(()=>{
  if(!mine||!navigator.geolocation)return;
  let stopped=false;
  const share=()=>navigator.geolocation.getCurrentPosition(async p=>{
   if(stopped)return;
   const round=v=>Math.round(v*10**CHECKIN_PLACES)/10**CHECKIN_PLACES,at={lat:round(p.coords.latitude),lng:round(p.coords.longitude)};
   setTrouble('');setLast({...at,at:new Date().toISOString()});
   try{await request('checkin',at);}catch{}
   const to=destinationPosition(state,mine);
   if(to&&kmBetween(to,{lat:p.coords.latitude,lng:p.coords.longitude})<=ARRIVE_KM&&!arriving.current){arriving.current=true;await mutate({type:'checkInArrive',id:mine.id});}
  },()=>{if(!stopped)setTrouble('The phone is not giving its position; the others will only see when you tap I’m here.');},{enableHighAccuracy:true,maximumAge:60000,timeout:20000});
  share();const t=setInterval(share,SHARE_EVERY_MS);
  return ()=>{stopped=true;clearInterval(t);};
 },[mine?.id]);
 return {last,trouble};
}
export function CheckInCard({state,user,now,request,mutate,busy,go}){
 const live=liveCheckIns(state,now),mine=live.find(c=>c.from===user.name&&!c.arrivedAt)||null,others=live.filter(c=>c!==mine);
 const share=useShare({mine,state,request,mutate});
 const [positions,setPositions]=useState([]);
 // The other phones' last positions, asked for every minute while somebody else is on their way.
 useEffect(()=>{
  if(!others.some(c=>!c.arrivedAt))return;
  let stopped=false;const load=()=>request('checkins').then(r=>{if(!stopped)setPositions(r.checkins||[]);}).catch(()=>{});
  load();const t=setInterval(load,60000);return ()=>{stopped=true;clearInterval(t);};
 },[others.filter(c=>!c.arrivedAt).map(c=>c.id).join()]);
 if(!live.length)return null;
 const parent=user.role==='parent';
 return <section className="checkin-card" aria-label="Check In">
  {mine&&<div className="checkin mine">
   <p className="eyebrow"><LocateFixed size={13}/> Check In · you</p>
   <strong>Back at {mine.label} by {dueClock(mine)}</strong>
   <small>{share.trouble||(share.last?`Sharing where you are · last shared ${ageText(checkinAge(share.last,now))}`:'Sharing where you are…')}</small>
   <div className="row wrap"><button type="button" className="primary" disabled={busy} onClick={()=>mutate({type:'checkInArrive',id:mine.id})}><Check size={16}/>I’m here</button><button type="button" disabled={busy} onClick={()=>mutate({type:'checkInCancel',id:mine.id})}><X size={16}/>Cancel</button></div>
  </div>}
  {others.map(c=>{
   const last=positions.find(p=>p.name===c.from)||null,status=checkInStatus(c,last,now),km=kmAway(state,c,last);
   const canEnd=parent||c.from===user.name;
   return <div key={c.id} className={`checkin is-${status}`}>
    <p className="eyebrow"><LocateFixed size={13}/> Check In · {c.from}</p>
    {status==='arrived'?<><strong>{c.from} arrived at {c.label}</strong><small>At {japanClock(new Date(c.arrivedAt))}{c.day!==japanDate(now)?' · another day':''}</small></>
    :<><strong>{c.from} is heading to {c.label}, back by {dueClock(c)}</strong>
     <small>{last?`${km!=null?`${kmText(km)} from ${c.label} · `:''}phone last spoke ${ageText(checkinAge(last,now))}`:'No position from the phone yet'}</small>
     {status==='late'&&<p className="checkin-late">Past {dueClock(c)} and no word for {quietMinutes(c,last,now)} min. A quiet phone is usually a phone in a pocket — but the cards are here if you need them.</p>}
     {status==='due'&&<p className="checkin-late soft">Past {dueClock(c)}, but the phone is still speaking.</p>}</>}
    <div className="row wrap">
     {status==='late'&&<><button type="button" onClick={()=>go('meeting')}><Users size={15}/>Meeting card</button><button type="button" onClick={()=>go('safety')}><LifeBuoy size={15}/>Lost card</button></>}
     {canEnd&&status!=='arrived'&&<button type="button" disabled={busy} onClick={()=>mutate({type:'checkInArrive',id:c.id})}><Check size={15}/>They’re back</button>}
     {canEnd&&<button type="button" disabled={busy} onClick={()=>mutate({type:'checkInCancel',id:c.id})}><X size={15}/>{status==='arrived'?'Dismiss':'Cancel'}</button>}
    </div>
   </div>;})}
 </section>;
}
const AHEAD=[30,60,90,120];
export function CheckInSheet({state,user,day,now,mutate,busy,close,notice}){
 const options=checkInDestinations(state,day);
 const [key,setKey]=useState(options[0]?.key||'other'),[other,setOther]=useState(''),[ahead,setAhead]=useState(60),[clock,setClock]=useState('');
 const chosen=options.find(o=>o.key===key);
 const dueAt=clock?new Date(`${japanDate(now)}T${clock}:00+09:00`):new Date(+now+ahead*60000);
 const label=key==='other'?other.trim():chosen?.label||'';
 const tooLate=+dueAt<+now-60000,tooFar=+dueAt>+now+CHECKIN_AHEAD_HOURS*3600000;
 async function start(){
  const ok=await mutate({type:'checkInStart',label,stepId:chosen?.stepId||null,hotel:chosen?.hotel||null,due:dueAt.toISOString()});
  if(ok){notice?.(`Checked in: back at ${label} by ${japanClock(dueAt)}. The others will see when you get there.`);close();}
 }
 return <div className="checkin-sheet">
  <p>Say where you are heading and by when. The other phones see it on Home, see how far you are as you go, and are told when you get there. If the time passes and this phone has gone quiet, theirs turns amber.</p>
  <p className="eyebrow">Heading to</p>
  <div className="checkin-options" role="radiogroup" aria-label="Where to">
   {options.map(o=><button type="button" key={o.key} role="radio" aria-checked={key===o.key} className={key===o.key?'is-on':''} onClick={()=>setKey(o.key)}><MapPin size={14}/>{o.label}</button>)}
   <button type="button" role="radio" aria-checked={key==='other'} className={key==='other'?'is-on':''} onClick={()=>setKey('other')}>Somewhere else</button>
  </div>
  {key==='other'&&<label>Where<input value={other} maxLength={120} onChange={e=>setOther(e.target.value)} placeholder="The Uniqlo on the corner"/></label>}
  <p className="eyebrow">Back by</p>
  <div className="checkin-ahead" role="radiogroup" aria-label="How long">
   {AHEAD.map(m=><button type="button" key={m} role="radio" aria-checked={!clock&&ahead===m} className={!clock&&ahead===m?'is-on':''} onClick={()=>{setClock('');setAhead(m);}}>{m<60?`${m} min`:m===60?'1 hr':`${m/60} hr`}<small>{japanClock(new Date(+now+m*60000))}</small></button>)}
   <label className="checkin-clock">or at<input type="time" value={clock} onChange={e=>setClock(e.target.value)}/></label>
  </div>
  {tooLate&&<p className="callout">That time has already passed.</p>}{tooFar&&<p className="callout">Keep it within the next twelve hours.</p>}
  <div className="row wrap"><button type="button" className="primary" disabled={busy||!label||tooLate||tooFar} onClick={start}><LocateFixed size={16}/>Start · back by {japanClock(dueAt)}</button><button type="button" onClick={close}>Not now</button></div>
  <small className="report-note">Where this phone is goes to the family’s own three-hour position list, rounded to about a hundred metres, only while the check-in is open.</small>
 </div>;
}
