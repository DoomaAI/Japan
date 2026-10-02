import React from 'react';
import PageTitle from './PageTitle.jsx';
import {RotateCcw,Trash2,History} from 'lucide-react';
import {BIN_KINDS,binVisible,canRestore,binDaysLeft,BIN_DAYS} from './bin-data.js';
import {japanClock} from './timing.js';
// Nothing taken off a list is gone for thirty days. Whoever removed it, or a parent, puts it
// back with one tap, exactly as it was; a parent can also let something go for good.
export default function RecentlyDeleted({state,user,mutate,busy}){
 const parent=user.role==='parent',entries=binVisible(state,user);
 return <>
  <p className="eyebrow">NOTHING IS GONE FOR THIRTY DAYS</p>
  <PageTitle help={<><p>Anything taken off a list, and any stop removed from the plan, waits here for {BIN_DAYS} days and comes back exactly as it was, ticks and ratings included.</p><p>Voice notes are the one thing that cannot wait here, because their recording goes with them.</p></>}>Recently deleted</PageTitle>
  {!entries.length&&<div className="empty"><History size={26}/><h3>Nothing waiting</h3><p>Whatever is removed from now on appears here, newest first.</p></div>}
  <ul className="bin-list">{entries.map(e=>{const k=BIN_KINDS[e.op],mine=canRestore(e,user),days=binDaysLeft(e);
   return <li key={e.id} className="bin-row">
    <div><strong>{e.title}</strong><small>{k?.label||e.kind} · removed by {e.by} at {japanClock(new Date(e.at))} · {days===0?'goes today':`${days} day${days===1?'':'s'} left`}</small></div>
    <div className="row">
     <button className="primary" disabled={busy||!mine} title={mine?'':'Only whoever removed it, or a parent, can bring it back'} onClick={()=>mutate({type:'binRestore',id:e.id})}><RotateCcw size={15}/> Put it back</button>
     {parent&&<button className="danger" disabled={busy} aria-label={`Delete ${e.title} for good`} onClick={()=>{if(confirm(`Delete “${e.title}” for good? It cannot be brought back after this.`))mutate({type:'binDrop',id:e.id});}}><Trash2 size={15}/></button>}
    </div>
   </li>;})}</ul>
 </>;
}
