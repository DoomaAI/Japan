import React,{useState} from 'react';
import {Check,MapPin} from 'lucide-react';
import {REPORT_KINDS,QUEUE_MINUTES,reportText} from './report-data.js';
import {askPhoneWhereItIs} from './geo.js';
import {PIN_PLACES} from './trip-features.js';
// One tap to tell the other phones what it is like here. Five big buttons and, for a queue, how
// long. The phone's position goes on it when the phone gives one quickly; when it does not, the
// report goes without, pinned to the stop, because the point is speed and the stop already says
// roughly where. Nothing is typed. The wording is written for the report, so the Noticed page and
// the diary read it as a sentence somebody said.
export default function ReportSheet({step,user,mutate,busy,close,notice}){
 const [kind,setKind]=useState(null),[minutes,setMinutes]=useState(30),[sending,setSending]=useState(false);
 const chosen=REPORT_KINDS.find(k=>k.id===kind);
 async function send(k,m){
  setSending(true);
  let pin=null;
  try{pin=await askPhoneWhereItIs(PIN_PLACES,4000);}catch{pin=null;}
  const report={kind:k.id,minutes:k.minutes?m:null};
  const ok=await mutate({type:'noticedAdd',text:reportText(k.id,m),stepId:step.id,pin,report,by:user.name});
  setSending(false);
  if(ok){notice?.(`Told the others: ${reportText(k.id,m)}${pin?'':' · without a position'}`);close();}
 }
 return <div className="report-sheet">
  <p>Tell the other phones what it is like at <b>{step.title}</b>. One tap; they see it on Home for the next two hours.</p>
  {!chosen&&<div className="report-kinds">{REPORT_KINDS.map(k=><button type="button" key={k.id} disabled={busy||sending} onClick={()=>k.minutes?setKind(k.id):send(k,null)}>
   <span aria-hidden="true">{k.icon}</span><b>{k.label}</b><small>{k.minutes?'How long, then send':k.text()}</small></button>)}</div>}
  {chosen&&<>
   <p className="eyebrow">{chosen.icon} {chosen.label} · about how long?</p>
   <div className="report-minutes" role="radiogroup" aria-label="Queue length">{QUEUE_MINUTES.map(m=><button type="button" key={m} role="radio" aria-checked={minutes===m} className={minutes===m?'is-on':''} onClick={()=>setMinutes(m)}>{m}<small>min</small></button>)}</div>
   <div className="row wrap"><button type="button" className="primary" disabled={busy||sending} onClick={()=>send(chosen,minutes)}><Check size={16}/>{sending?'Sending…':`Send: ${reportText(chosen.id,minutes)}`}</button><button type="button" onClick={()=>setKind(null)}>Back</button></div>
  </>}
  <small className="report-note"><MapPin size={12}/> {sending?'Reading where the phone is…':'Sent with where this phone is, when it can be read in a few seconds.'}</small>
 </div>;
}
