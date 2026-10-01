import React,{useState} from 'react';
import {ConciergeBell,Copy,Maximize2,X} from 'lucide-react';
import {REQUESTS,requestText,requestDefaults} from './concierge-data.js';
import {activeSteps} from './timing.js';
// Ask the front desk: a request written out in polite Japanese, filled in from the trip, to show
// at the desk or paste into the hotel's chat. A parent picks what it is, checks the details, and
// shows it full screen; nothing is sent from here.
export default function ConciergeDesk({state,day,notice}){
 const [kind,setKind]=useState(null),[values,setValues]=useState({}),[shown,setShown]=useState(false);
 const req=REQUESTS.find(r=>r.id===kind);
 const stops=activeSteps(state,day).filter(s=>s.place);
 const pick=id=>{setKind(id);setValues(requestDefaults(state,id,day));setShown(false);};
 const text=req?requestText(state,req.id,values):null;
 const set=(k,v)=>setValues(x=>({...x,[k]:v}));
 const copy=async()=>{try{await navigator.clipboard.writeText([...text.ja,'',...text.en].join('\n'));notice?.('Copied, Japanese and English.');}catch{notice?.('This phone would not let the app copy. Show it at the desk instead.');}};
 return <details className="concierge-desk">
  <summary><ConciergeBell size={16}/>Ask the front desk, in Japanese</summary>
  <p>For what is hard to do ourselves: a restaurant that only books by phone, a taxi for a set time, something left on a train, a doctor. Fill it in, then show it at the desk.</p>
  <div className="chips">{REQUESTS.map(r=><button type="button" key={r.id} className={`chip${kind===r.id?' is-on':''}`} onClick={()=>pick(r.id)}><span aria-hidden="true">{r.icon}</span> {r.label}</button>)}</div>
  {req&&<form className="concierge-form" onSubmit={e=>{e.preventDefault();setShown(true);}}>
   {(req.id==='restaurant'||req.id==='taxi')&&stops.length>0&&<label>From today’s plan<select value="" onChange={e=>{const s=stops.find(x=>x.id===e.target.value);if(s){set('place',s.place);set('japanese',s.japanese||'');}}}>
    <option value="">Choose a stop…</option>{stops.map(s=><option key={s.id} value={s.id}>{s.time?`${s.time} `:''}{s.title}</option>)}</select></label>}
   {req.fields.map(([k,label,type])=><label key={k}>{label}<input type={type||'text'} min={type==='number'?0:undefined} max={type==='number'?20:undefined} value={values[k]??''} maxLength={type?undefined:300} onChange={e=>set(k,e.target.value)}/></label>)}
   {(req.id==='restaurant'||req.id==='taxi')&&<label>Its Japanese name or address, if you have it<input value={values.japanese??''} maxLength={200} lang="ja" onChange={e=>set('japanese',e.target.value)}/></label>}
   <button className="primary"><Maximize2 size={16}/>Show the desk</button>
  </form>}
  {req&&text&&<div className="concierge-preview">
   <p lang="ja">{text.ja.map((l,i)=><React.Fragment key={i}>{l}<br/></React.Fragment>)}</p>
   <small>{text.en.join(' · ')}</small>
   <div className="row wrap"><button type="button" onClick={copy}><Copy size={16}/>Copy for the hotel’s chat</button></div>
  </div>}
  {shown&&text&&<div className="concierge-full" role="dialog" aria-label="Request for the front desk" onClick={()=>setShown(false)}>
   <button type="button" className="icon" aria-label="Close" onClick={()=>setShown(false)}><X size={22}/></button>
   <p lang="ja">{text.ja.map((l,i)=><React.Fragment key={i}>{l}<br/></React.Fragment>)}</p>
   <small>{text.en.join(' · ')}</small>
  </div>}
 </details>;
}
