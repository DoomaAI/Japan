import React,{useState} from 'react';
import {Clock,Check,MapPin,Send,LocateFixed,EyeOff} from 'lucide-react';
import {lateFor,lateDefaults,lateTargets,lateLine,etaText,lateEta,whoText,LATE_MINUTES,LATE_NOTE_MAX} from './late-data.js';
import {ageText,checkinAge} from './memory-map.js';
import {japanClock,japanDate} from './timing.js';
import {SHARE_FOR} from './live-share.js';
// On Home and on Where we are: the running-late messages this phone was told or sent. To the
// people waiting it says who, how late, for what and about when, with Got it and the map. To
// whoever sent it, who has seen it, Later still, and We're here.
export function LateCards({state,user,now,mutate,busy,go,open,live}){
 const notes=lateFor(state,user.name,now),sharing=live?.until;
 if(!notes.length&&!sharing)return null;
 const parent=user.role==='parent';
 return <section className="late-card" aria-label="Running late">
  {notes.map(n=>{
   const mine=n.with.includes(user.name),toMe=n.to.includes(user.name),seen=Object.keys(n.seenBy||{});
   return <div key={n.id} className={`late${mine?' mine':''}`}>
    <p className="eyebrow"><Clock size={13}/> Running late · {ageText(checkinAge({at:n.at},now))}</p>
    <strong>{lateLine(n,user.name)}</strong>
    <small>{etaText(n)}{mine?` · told ${whoText(n.to,user.name)}`:''}</small>
    {n.note&&<p className="late-note">“{n.note}”{!mine&&<small> · {n.from}</small>}</p>}
    {mine&&<small>{seen.length?`Seen by ${whoText(seen,user.name)}`:'Not seen yet'}</small>}
    <div className="row wrap">
     {toMe&&!n.seenBy?.[user.name]&&<button type="button" className="primary" disabled={busy} onClick={()=>mutate({type:'lateSeen',id:n.id})}><Check size={15}/>Got it</button>}
     {!mine&&<button type="button" onClick={()=>go('whereabouts')}><MapPin size={15}/>Where are they?</button>}
     {mine&&<button type="button" disabled={busy} onClick={()=>open({type:'latemsg'})}><Clock size={15}/>Later still</button>}
     {(mine||parent)&&<button type="button" disabled={busy} onClick={()=>mutate({type:'lateClear',id:n.id})}><Check size={15}/>{mine?'We’re here':'They’re here'}</button>}
    </div>
   </div>;})}
  {sharing&&<div className="late sharing">
   <p className="eyebrow"><LocateFixed size={13}/> Sharing where you are</p>
   <small>Until {japanClock(new Date(sharing))}{live.last?` · last sent ${ageText(checkinAge(live.last,now))}`:''}{live.trouble?` · ${live.trouble}`:''}</small>
   <div className="row wrap"><button type="button" onClick={()=>go('whereabouts')}><MapPin size={15}/>Map</button><button type="button" onClick={()=>live.stop().catch(()=>{})}><EyeOff size={15}/>Stop sharing</button></div>
  </div>}
 </section>;
}
const toggle=(list,n)=>list.includes(n)?list.filter(x=>x!==n):[...list,n];
export function LateSheet({state,user,day,now,mutate,busy,close,notice,live}){
 const today=japanDate(now),onDay=day===today?day:today;
 const start=lateDefaults(state,onDay,user.name,now),targets=lateTargets(state,onDay,user.name,now);
 const [withUs,setWith]=useState(start.with),[to,setTo]=useState(start.to),[mins,setMins]=useState(10),[key,setKey]=useState(start.target?.key||''),[note,setNote]=useState('');
 const [share,setShare]=useState(SHARE_FOR.includes(60)?60:SHARE_FOR.at(-1)||0);
 const target=targets.find(t=>t.key===key)||null,eta=lateEta({minutes:mins,time:target?.time,day:onDay},now);
 const parent=user.role==='parent';
 const preview={with:withUs.includes(user.name)?withUs:[user.name,...withUs],minutes:mins,target:target?.label||null,eta:eta.toISOString(),time:target?.time&&+eta!==+now+mins*60000?target.time:null};
 async function send(){
  const ok=await mutate({type:'lateSend',minutes:mins,with:preview.with,to,target:target?.label||null,stepId:target?.stepId||null,time:target?.time||null,note:note.trim()||null});
  if(!ok)return;
  if(share&&live){live.start(share);}
  notice?.(`Told ${whoText(to,user.name)}: ${mins} min late.`);close();
 }
 const people=state.members.filter(m=>m!==user.name);
 return <div className="checkin-sheet late-sheet">
  <p>Tell the people waiting that you are behind. Nothing in the plan moves: it is a message, to the phones you pick, with a notification if they have them switched on.</p>
  <p className="eyebrow">Who is running late</p>
  <div className="checkin-options" role="group" aria-label="Who is running late">
   <button type="button" className="is-on" aria-pressed="true" disabled>Me</button>
   {people.map(m=><button type="button" key={m} aria-pressed={withUs.includes(m)} className={withUs.includes(m)?'is-on':''} onClick={()=>{setWith(toggle(withUs,m));setTo(to.filter(x=>x!==m));}}>{m}</button>)}
  </div>
  <p className="eyebrow">Tell</p>
  <div className="checkin-options" role="group" aria-label="Who to tell">
   {people.filter(m=>!withUs.includes(m)).map(m=><button type="button" key={m} aria-pressed={to.includes(m)} className={to.includes(m)?'is-on':''} onClick={()=>setTo(toggle(to,m))}>{m}</button>)}
  </div>
  <p className="eyebrow">How late</p>
  <div className="checkin-ahead" role="radiogroup" aria-label="How late">
   {LATE_MINUTES.map(m=><button type="button" key={m} role="radio" aria-checked={mins===m} className={mins===m?'is-on':''} onClick={()=>setMins(m)}>{m} min</button>)}
  </div>
  <p className="eyebrow">Late for</p>
  <div className="checkin-options" role="radiogroup" aria-label="Late for">
   {targets.map(t=><button type="button" key={t.key} role="radio" aria-checked={key===t.key} className={key===t.key?'is-on':''} onClick={()=>setKey(t.key)}><MapPin size={14}/>{t.time?`${t.time} · `:''}{t.label}</button>)}
   <button type="button" role="radio" aria-checked={!key} className={!key?'is-on':''} onClick={()=>setKey('')}>Nothing in particular</button>
  </div>
  <label>A word with it (optional)<input value={note} maxLength={LATE_NOTE_MAX} onChange={e=>setNote(e.target.value)} placeholder="Train was full, on the next one"/></label>
  <label className="checkline"><input type="checkbox" checked={!!share} onChange={e=>setShare(e.target.checked?(SHARE_FOR.includes(60)?60:SHARE_FOR.at(-1)):0)}/><span>Share where I am for the next {share||60} min<small>{parent?'Everyone in the family can see where a parent is.':'Mum and Dad see where you are.'} Rounded to about 100 m, while the app is open.</small></span></label>
  <p className="late-preview"><strong>{lateLine(preview,user.name)}</strong><small>{etaText(preview)}</small></p>
  <div className="row wrap"><button type="button" className="primary" disabled={busy||!to.length} onClick={send}><Send size={16}/>Tell {to.length?whoText(to,user.name):'…'}</button><button type="button" onClick={close}>Not now</button></div>
 </div>;
}
