import React,{useState} from 'react';
import {CalendarCheck,Check,ChevronDown,SkipForward,X} from 'lucide-react';
import {yesterdayLog} from './yesterday-data.js';
import {caughtUpAt} from './tonight-data.js';
// One slim line across the top of Home, the morning after a day with stops nobody ticked off:
// log them as done, or (a parent) as skipped, without opening yesterday. Tapped, it opens to the
// stops; the cross puts it away for the day on this phone. It goes by itself once all are logged.
export default function YesterdayLine({state,user,today,mutate,busy,notice}){
 const key=`japan.yesterday.${user?.name}.${today}`;
 const [gone,setGone]=useState(()=>{try{return localStorage.getItem(key)==='dismissed';}catch{return false;}});
 const [open,setOpen]=useState(false);
 const parent=user?.role==='parent',log=yesterdayLog(state,user?.name,parent,today);
 if(!log||gone)return null;
 const dismiss=()=>{try{localStorage.setItem(key,'dismissed');}catch{}setGone(true);};
 const n=log.open.length,last=n===1;
 const did=async s=>{if(await mutate({type:'status',id:s.id,status:'done',at:caughtUpAt(s,log.day)})&&last)notice?.('Yesterday is logged.');};
 const skip=async s=>{if(await mutate({type:'status',id:s.id,status:'skipped'})&&last)notice?.('Yesterday is logged.');};
 async function all(){
  for(const s of log.open)if(!await mutate({type:'status',id:s.id,status:'done',at:caughtUpAt(s,log.day)}))return;
  notice?.(`Yesterday is logged: ${n} stop${n===1?'':'s'} done.`);
 }
 return <section className={`yesterday-line${open?' open':''}`} aria-label="Log yesterday">
  <div className="yesterday-bar">
   <button type="button" className="yesterday-toggle" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>
    <CalendarCheck size={18}/><span><b>Log yesterday</b><small>{n} stop{last?'':'s'} not ticked off · {log.title}</small></span><ChevronDown size={16} className="yesterday-chevron"/>
   </button>
   <button type="button" className="icon yesterday-dismiss" aria-label="Dismiss for today" onClick={dismiss}><X size={16}/></button>
  </div>
  {open&&<div className="yesterday-list">
   {log.open.map(s=><div className="yesterday-row" key={s.id}><span>{s.time&&<small>{s.time}</small>}{s.title}</span>
    <div className="row"><button type="button" disabled={busy} aria-label={`We did ${s.title}`} onClick={()=>did(s)}><Check size={15}/>Did it</button>
     {parent&&<button type="button" disabled={busy} aria-label={`We skipped ${s.title}`} onClick={()=>skip(s)}><SkipForward size={15}/>Skipped</button>}</div></div>)}
   {n>1&&<button type="button" className="yesterday-all" disabled={busy} onClick={all}><Check size={15}/>We did them all</button>}
  </div>}
 </section>;
}
